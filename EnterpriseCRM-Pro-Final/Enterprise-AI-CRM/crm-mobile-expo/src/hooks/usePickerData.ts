import { useEffect, useState } from 'react';

import { listCustomers } from '@/api/customer.api';
import { listInvoices } from '@/api/invoices.api';
import { listLeads } from '@/api/leads.api';
import { listOpportunities } from '@/api/opportunities.api';
import { listProducts } from '@/api/products.api';
import { listUsers } from '@/api/users.api';
import type { PickerItem } from '@/components/form/fields';
import type { Invoice, Product } from '@/types';

type Source = 'users' | 'customers' | 'leads' | 'deals' | 'invoices' | 'products';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES: 'Sales',
  EMPLOYEE: 'Employee',
};

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/**
 * Loads options for picker fields. Every list comes from the API,
 * which already filters by the caller's role and team, so a rep
 * can only pick records they are allowed to see.
 */
export function usePickerData(source: Source, enabled = true) {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [raw, setRaw] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const load = async (): Promise<[PickerItem[], unknown[]]> => {
      switch (source) {
        case 'users': {
          const users = await listUsers();
          return [users.map(u => ({ id: u.id, title: u.name, subtitle: `${ROLE_LABEL[u.role] ?? u.role} · ${u.email}` })), users];
        }
        case 'customers': {
          const page = await listCustomers({ pageSize: 100 });
          return [
            page.items.map(c => ({ id: c.id, title: c.name, subtitle: c.email ?? c.phone ?? undefined })),
            page.items,
          ];
        }
        case 'leads': {
          const leads = await listLeads();
          return [
            leads
              .filter(l => l.status !== 'CONVERTED' && l.status !== 'LOST')
              .map(l => ({ id: l.id, title: l.name, subtitle: l.status.toLowerCase() })),
            leads,
          ];
        }
        case 'deals': {
          const deals = await listOpportunities();
          return [
            deals.map(d => ({ id: d.id, title: d.title, subtitle: `${d.stage.toLowerCase()} · ${money(d.amount)}` })),
            deals,
          ];
        }
        case 'invoices': {
          const invoices = await listInvoices();
          const open = invoices.filter((i: Invoice) => i.status === 'PENDING' || i.status === 'OVERDUE');
          return [
            open.map(i => ({
              id: i.id,
              title: `${i.invoiceNumber} · ${money(i.total)}`,
              subtitle: `${i.customer?.name ?? 'Customer'} · ${i.status.toLowerCase()}`,
            })),
            open,
          ];
        }
        case 'products': {
          const products = await listProducts();
          const active = products.filter((p: Product) => p.isActive);
          return [active.map(p => ({ id: p.id, title: p.name, subtitle: `${money(p.price)}${p.sku ? ` · ${p.sku}` : ''}` })), active];
        }
      }
    };

    load()
      .then(([list, data]) => {
        if (cancelled) return;
        setItems(list);
        setRaw(data);
        setError(false);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [enabled, source]);

  return { items, raw, loading, error };
}
