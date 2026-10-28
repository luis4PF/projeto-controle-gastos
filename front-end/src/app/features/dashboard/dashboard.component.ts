import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin } from 'rxjs';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { NotificationService } from '../../core/services/notification.service';
import { Expense } from '../../core/models/expense.model';
import { Category } from '../../core/models/category.model';
import { categoryPath } from '../../shared/utils/category-path';
import { BrlCentsPipe } from '../../shared/pipes/brl-cents.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatProgressSpinnerModule, BaseChartDirective, BrlCentsPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly expensesApi = inject(ExpenseService);
  private readonly categoriesApi = inject(CategoryService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly totalMonth = signal(0);
  protected readonly totalYear = signal(0);
  protected readonly monthRank = signal<{ key: string; label: string; cents: number }[]>([]);
  protected readonly monthCompare = signal<{ key: string; label: string; cents: number }[]>([]);

  protected pieType: ChartType = 'pie';
  protected pieData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  protected pieOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
  };

  protected barType: ChartType = 'bar';
  protected barData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  protected barOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 0 } },
      y: { beginAtZero: true },
    },
  };

  ngOnInit(): void {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const pad = (n: number) => String(n).padStart(2, '0');
    const from = `${y}-01-01`;
    const to = `${y}-12-31`;

    forkJoin({
      expenses: this.expensesApi.list({ from, to, excludeCancelled: true }),
      categories: this.categoriesApi.list(),
    }).subscribe({
      next: ({ expenses, categories }) => {
        this.apply(expenses, categories, y, m);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Erro ao montar o dashboard.');
      },
    });
  }

  private apply(expenses: Expense[], categories: Category[], year: number, month: number): void {
    const monthPrefix = `${year}-${this.pad2(month)}`;
    let tm = 0;
    let ty = 0;
    const byMonth = new Map<string, number>();
    const byCategory = new Map<string, number>();

    for (const e of expenses) {
      if (e.recordStatus === 'cancelled') continue;
      ty += e.amountCents;
      if (e.date.startsWith(monthPrefix)) {
        tm += e.amountCents;
      }
      const mk = e.date.slice(0, 7);
      byMonth.set(mk, (byMonth.get(mk) ?? 0) + e.amountCents);
      const path = categoryPath(categories, e.categoryId);
      byCategory.set(path, (byCategory.get(path) ?? 0) + e.amountCents);
    }

    this.totalMonth.set(tm);
    this.totalYear.set(ty);

    const monthLabels = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const barLabels: string[] = [];
    const barVals: number[] = [];
    for (let i = 1; i <= 12; i++) {
      const key = `${year}-${this.pad2(i)}`;
      barLabels.push(monthLabels[i - 1]);
      barVals.push((byMonth.get(key) ?? 0) / 100);
    }
    this.barData = {
      labels: barLabels,
      datasets: [
        {
          data: barVals,
          label: `Gastos ${year} (R$)`,
          backgroundColor: 'rgba(25, 118, 210, 0.75)',
        },
      ],
    };

    const pieLabels = [...byCategory.keys()];
    const pieVals = pieLabels.map((k) => (byCategory.get(k) ?? 0) / 100);
    this.pieData = {
      labels: pieLabels,
      datasets: [{ data: pieVals }],
    };

    const rank = [...byMonth.entries()]
      .map(([key, cents]) => ({
        key,
        label: this.formatMonthKey(key),
        cents,
      }))
      .sort((a, b) => b.cents - a.cents);
    this.monthRank.set(rank);

    const compare = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, cents]) => ({
        key,
        label: this.formatMonthKey(key),
        cents,
      }));
    this.monthCompare.set(compare);
  }

  private formatMonthKey(key: string): string {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  private pad2(n: number): string {
    return String(n).padStart(2, '0');
  }
}
