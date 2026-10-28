import { Category } from '../../core/models/category.model';

/** Ex.: "IPVA › IPVA 2026" */
export function categoryPath(categories: Category[], id: string): string {
  const map = new Map(categories.map((c) => [c.id, c]));
  const parts: string[] = [];
  let cur: Category | undefined = map.get(id);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    parts.unshift(cur.name);
    cur = cur.parentId ? map.get(cur.parentId) : undefined;
  }
  return parts.join(' › ') || '—';
}

/** Lista ordenada para `<mat-select>` com indentação hierárquica. */
export function flatCategoriesForSelect(categories: Category[]): { id: string; label: string }[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of categories) {
    const k = c.parentId;
    const list = byParent.get(k) ?? [];
    list.push(c);
    byParent.set(k, list);
  }
  for (const [, list] of byParent) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  const out: { id: string; label: string }[] = [];
  const walk = (parentId: string | null, depth: number): void => {
    const list = byParent.get(parentId) ?? [];
    for (const c of list) {
      const pad = depth > 0 ? `${'·'.repeat(depth)} ` : '';
      out.push({ id: c.id, label: `${pad}${c.name}` });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Apenas categorias raiz (grupos), ordenadas por nome — para vincular um item a um grupo. */
export function rootCategoriesSorted(categories: Category[]): Category[] {
  return categories
    .filter((c) => c.parentId == null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Apenas categorias folha (items sem filhos), com indentação hierárquica — para seleção em despesas. */
export function leafCategoriesForSelect(categories: Category[]): { id: string; label: string }[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of categories) {
    const k = c.parentId;
    const list = byParent.get(k) ?? [];
    list.push(c);
    byParent.set(k, list);
  }
  for (const [, list] of byParent) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  const out: { id: string; label: string }[] = [];
  const walk = (parentId: string | null, depth: number): void => {
    const list = byParent.get(parentId) ?? [];
    for (const c of list) {
      const hasChildren = (byParent.get(c.id) ?? []).length > 0;
      if (!hasChildren) {
        // Apenas categorias folha (sem filhos)
        const pad = depth > 0 ? `${'·'.repeat(depth)} ` : '';
        out.push({ id: c.id, label: `${pad}${c.name}` });
      }
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/**
 * IDs do grupo `rootId` e de todos os itens abaixo dele (filhos diretos e indiretos).
 * Usado no filtro de gastos: escolher "IPVA" inclui IPVA 2025, IPVA 2026, etc.
 */
export function categoryIdsInSubtree(categories: Category[], rootId: string): Set<string> {
  const byParent = new Map<string | null, string[]>();
  for (const c of categories) {
    const k = c.parentId;
    const list = byParent.get(k) ?? [];
    list.push(c.id);
    byParent.set(k, list);
  }
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const children = byParent.get(id);
    if (children) {
      for (const ch of children) {
        stack.push(ch);
      }
    }
  }
  return out;
}
