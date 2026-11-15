/**
 * Extra demo data for the two demo companies (run after seed:demo), so
 * every role has enough records to try CRUD, workflow and permissions:
 * more products, customers, leads, deals, invoices with payments, tasks
 * (personal, assigned by a manager, and general team tasks; some done on
 * time, some late) and calendar events.
 *
 *   npm run seed:more                     # API at http://localhost:4000/api/v1
 *   npm run seed:more -- http://host:4000/api/v1
 *
 * Everything is created through the public API as the right user, so it
 * passes the same validation and permission checks as real use. Running
 * it again adds no second copy (the first extra product's SKU is the marker).
 * Dates are then spread directly in MongoDB, as seed-demo does.
 *
 * Every run also makes sure there are sales for TODAY (once per day):
 * a few deals are created and won, one invoice is paid and some calls are
 * logged, so "Today's Sales" and "Today's Activity" on the dashboards are
 * never empty when you demo. Run it again on another day for that day.
 */
import mongoose, { Types } from 'mongoose';

import { env } from '@/config/env';

const API = (process.argv[2] ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');

type Key = 'owner' | 'admin' | 'manager' | 'sales' | 'sales2' | 'employee';

interface Extra {
  name: string;
  /** e-mail and password per role key (same people as seed-demo). */
  logins: Record<Key, [string, string]>;
  jobTitles: Record<Key, string>;
  products: [name: string, sku: string, category: string, price: number, stock: number][];
  customers: [name: string, city: string, owner: Key][];
  leads: [name: string, source: string, status: string, assignee: Key][];
  deals: [title: string, amount: number, stage: string, owner: Key, customer: number, closeInDays: number, monthsAgo: number][];
  invoices: [customer: number, product: number, qty: number, taxRate: number, dueInDays: number, pay: 'full' | 'partial' | 'none', by: Key, monthsAgo: number][];
  /** assignee null = general team task. doneDaysAgo set = completed that many days ago (by doneBy or the assignee). */
  tasks: [type: string, summary: string, by: Key, assignee: Key | null, dueInDays: number, doneDaysAgo?: number, doneBy?: Key][];
  events: [title: string, type: string, inDays: number, hour: number, minutes: number, location: string, by: Key, attendees: Key[]][];
}

/** Office tasks that make sense in any company; each company adds its own sales follow-ups. */
const commonTasks: Extra['tasks'] = [
  ['TASK', 'Update the price list sheet for this month', 'manager', 'employee', -6, 6],
  ['TASK', 'File last week’s delivery challans', 'admin', 'employee', -5, 5],
  ['TASK', 'Reconcile courier bills with dispatch register', 'manager', 'employee', -4, 2],
  ['TASK', 'Back up the accounts folder to the shared drive', 'owner', 'employee', -3, 3],
  ['TASK', 'Count and label the sample stock', 'admin', 'employee', -2, 1],
  ['TASK', 'Send yesterday’s attendance sheet to HR', 'manager', 'employee', -1, 1],
  ['TASK', 'Prepare today’s dispatch list', 'manager', 'employee', 0],
  ['CALL', 'Confirm transport pickup time with the courier', 'admin', 'employee', 0],
  ['TASK', 'Renew the office internet plan', 'owner', 'employee', 3],
  ['TASK', 'Tidy the product photos folder', 'employee', 'employee', 5],
  ['TASK', 'Order printer paper and toner', 'owner', null, 1],
  ['TASK', 'Collect visiting cards from the printer', 'admin', null, 4],
  ['TASK', 'Water purifier service — call the vendor', 'manager', null, -1],
  ['TASK', 'Put up the holiday list on the notice board', 'admin', null, 0, 0, 'employee'],
  ['TASK', 'Review the team’s open quotations', 'manager', 'manager', 1],
  ['TASK', 'Approve leave requests for next week', 'admin', 'admin', 2],
];

const commonEvents: Extra['events'] = [
  ['Monday stand-up', 'MEETING', 0, 17, 20, 'Office floor', 'manager', ['sales', 'employee']],
  ['Town hall — quarterly update', 'MEETING', 3, 16, 60, 'Main hall', 'owner', []],
  ['Stock audit', 'DEADLINE', 5, 11, 120, 'Warehouse', 'admin', ['employee']],
  ['Safety and fire drill', 'OTHER', 6, 15, 30, 'Whole office', 'admin', []],
  ['CRM training for new joiners', 'MEETING', 2, 14, 45, 'Training room', 'manager', ['employee', 'sales2']],
  ['Month-end billing cut-off', 'DEADLINE', 12, 18, 15, 'Accounts', 'owner', []],
];

const extras: Extra[] = [
  {
    name: 'Shree Ganesh Textiles',
    logins: {
      owner: ['harsh.owner@sgtextiles.com', 'Harsh@123456'],
      admin: ['trusha.admin@sgtextiles.com', 'Trusha@123456'],
      manager: ['pari.manager@sgtextiles.com', 'Pari@123456'],
      sales: ['ritik.sales@sgtextiles.com', 'Ritik@123456'],
      sales2: ['neha.sales@sgtextiles.com', 'Neha@123456'],
      employee: ['dhruv.emp@sgtextiles.com', 'Dhruv@123456'],
    },
    jobTitles: { owner: 'Managing Director', admin: 'Office Administrator', manager: 'Sales Manager – Gujarat', sales: 'Business Development Executive', sales2: 'Business Development Executive', employee: 'Store & Dispatch Executive' },
    products: [
      ['Linen Fabric Roll (50 m)', 'SG-LIN-50', 'Fabric', 14500, 60],
      ['Printed Dupatta (pack of 10)', 'SG-DUP-10', 'Accessories', 2800, 150],
      ['Hotel Bed Linen Set', 'SG-BED-SET', 'Linen', 1850, 300],
      ['Embroidery Job Work (per 100 pcs)', 'SG-SRV-EMB', 'Services', 6500, 0],
    ],
    customers: [
      ['Shreeji Fashion Mart', 'Vadodara', 'sales'],
      ['Little Stars Play School', 'Rajkot', 'sales'],
      ['Meena Bazaar Emporium', 'Surat', 'sales'],
      ['Heritage Inn Hotels', 'Udaipur', 'sales2'],
      ['Rangoli Designer Studio', 'Mumbai', 'sales2'],
      ['Balaji Uniform Suppliers', 'Pune', 'sales2'],
      ['Gurukul Public School', 'Anand', 'manager'],
      ['Amba Textile Traders', 'Bhavnagar', 'manager'],
    ],
    leads: [
      ['Kiran Tailoring Works', 'REFERRAL', 'NEW', 'sales'],
      ['Sai Krupa Hostel', 'WEBSITE', 'CONTACTED', 'sales'],
      ['Bright Future Academy', 'COLD_CALL', 'QUALIFIED', 'sales'],
      ['Fashion Fiesta Exhibitions', 'EVENT', 'CONTACTED', 'sales'],
      ['Mahalaxmi Saree Centre', 'SOCIAL_MEDIA', 'NEW', 'sales2'],
      ['Grand Palace Banquets', 'REFERRAL', 'QUALIFIED', 'sales2'],
      ['Apex Security Services', 'WEBSITE', 'LOST', 'sales2'],
      ['Vraj Garments Export', 'COLD_CALL', 'UNQUALIFIED', 'sales2'],
      ['Sardar Patel Vidyalaya', 'EVENT', 'CONTACTED', 'manager'],
      ['Tulsi Boutique Chain', 'SOCIAL_MEDIA', 'NEW', 'manager'],
    ],
    deals: [
      ['Shreeji Fashion – linen summer range', 290000, 'PROPOSAL', 'sales', 0, 18, 0],
      ['Little Stars – 250 uniform sets', 237500, 'NEGOTIATION', 'sales', 1, 9, 1],
      ['Meena Bazaar – dupatta bulk order', 140000, 'WON', 'sales', 2, -15, 2],
      ['Heritage Inn – bed linen for 3 hotels', 555000, 'QUALIFICATION', 'sales2', 3, 45, 0],
      ['Rangoli Studio – embroidery job work', 97500, 'WON', 'sales2', 4, -40, 4],
      ['Balaji Uniforms – polyester blend', 208000, 'PROSPECTING', 'sales2', 5, 30, 1],
      ['Gurukul School – annual uniform contract', 665000, 'PROPOSAL', 'manager', 6, 22, 0],
      ['Amba Traders – cotton rolls', 170000, 'LOST', 'manager', 7, -25, 3],
    ],
    invoices: [
      [2, 1, 50, 5, -45, 'full', 'sales', 2],
      [4, 3, 15, 18, -75, 'full', 'sales2', 4],
      [1, 3, 100, 12, 10, 'partial', 'sales', 1],
      [3, 2, 120, 12, -8, 'none', 'sales2', 0],
      [6, 3, 200, 12, 20, 'partial', 'manager', 0],
      [0, 0, 12, 5, -12, 'none', 'sales', 1],
    ],
    tasks: [
      ...commonTasks,
      ['CALL', 'Call Shreeji Fashion about linen shade cards', 'sales', 'sales', 0],
      ['EMAIL', 'Send bed linen catalogue to Heritage Inn', 'sales2', 'sales2', 2],
      ['TASK', 'Collect measurement sheet from Little Stars', 'manager', 'sales', -1],
      ['MEETING', 'Sample presentation at Gurukul School', 'manager', 'manager', 6],
      ['CALL', 'Payment reminder call to Meena Bazaar', 'sales', 'sales', -3, 2],
    ],
    events: [
      ...commonEvents,
      ['Linen range presentation – Shreeji Fashion', 'MEETING', 1, 11, 60, 'Vadodara showroom', 'sales', []],
      ['Heritage Inn site visit', 'MEETING', 7, 10, 120, 'Udaipur', 'sales2', ['manager']],
    ],
  },
  {
    name: 'Nova Electronics',
    logins: {
      owner: ['aarav.owner@novaelectronics.com', 'Aarav@123456'],
      admin: ['meera.admin@novaelectronics.com', 'Meera@123456'],
      manager: ['kabir.manager@novaelectronics.com', 'Kabir@123456'],
      sales: ['ananya.sales@novaelectronics.com', 'Ananya@123456'],
      sales2: ['vikram.sales@novaelectronics.com', 'Vikram@123456'],
      employee: ['rohan.emp@novaelectronics.com', 'Rohan@123456'],
    },
    jobTitles: { owner: 'Chief Executive Officer', admin: 'Operations Administrator', manager: 'Regional Sales Manager – South', sales: 'Business Development Executive', sales2: 'Business Development Executive', employee: 'Service Coordinator' },
    products: [
      ['EV Charger 7.4 kW', 'NV-EVC-7K', 'Power', 54000, 45],
      ['Smart Energy Meter', 'NV-MTR-SM', 'IoT', 6200, 400],
      ['Video Door Phone Kit', 'NV-VDP-01', 'Security', 11800, 90],
      ['Installation & Commissioning', 'NV-SRV-INS', 'Services', 8500, 0],
    ],
    customers: [
      ['Lakeview Apartments RWA', 'Bengaluru', 'sales'],
      ['Sri Venkateshwara Hospital', 'Chennai', 'sales'],
      ['BlueOrbit Co-working', 'Bengaluru', 'sales'],
      ['Coastal Cold Storage', 'Kochi', 'sales2'],
      ['Deccan Engineering College', 'Hyderabad', 'sales2'],
      ['Sunmart Hypermarkets', 'Pune', 'sales2'],
      ['Greenfield Villas', 'Mysuru', 'manager'],
      ['Tristar Logistics Park', 'Chennai', 'manager'],
    ],
    leads: [
      ['Palm Grove Resorts', 'REFERRAL', 'NEW', 'sales'],
      ['Metro Diagnostics Lab', 'WEBSITE', 'CONTACTED', 'sales'],
      ['Skyline Builders', 'COLD_CALL', 'QUALIFIED', 'sales'],
      ['TechNest Incubator', 'EVENT', 'CONTACTED', 'sales'],
      ['Annapurna Food Court', 'SOCIAL_MEDIA', 'NEW', 'sales2'],
      ['Vidya Niketan School', 'REFERRAL', 'QUALIFIED', 'sales2'],
      ['Harbor Freight Forwarders', 'WEBSITE', 'LOST', 'sales2'],
      ['Zenith Fitness Clubs', 'COLD_CALL', 'UNQUALIFIED', 'sales2'],
      ['Orchid Convention Centre', 'EVENT', 'CONTACTED', 'manager'],
      ['Silverline Pharma', 'SOCIAL_MEDIA', 'NEW', 'manager'],
    ],
    deals: [
      ['Lakeview RWA – 12 EV chargers', 648000, 'PROPOSAL', 'sales', 0, 20, 0],
      ['Sri Venkateshwara – CCTV upgrade', 420000, 'NEGOTIATION', 'sales', 1, 8, 1],
      ['BlueOrbit – smart lighting retrofit', 196000, 'WON', 'sales', 2, -18, 2],
      ['Coastal Cold Storage – IoT monitoring', 378000, 'QUALIFICATION', 'sales2', 3, 40, 0],
      ['Deccan College – solar inverters', 685000, 'WON', 'sales2', 4, -45, 4],
      ['Sunmart – energy meters, 6 stores', 223200, 'PROSPECTING', 'sales2', 5, 28, 1],
      ['Greenfield Villas – video door phones', 354000, 'PROPOSAL', 'manager', 6, 24, 0],
      ['Tristar Park – AMC renewal', 150000, 'LOST', 'manager', 7, -22, 3],
    ],
    invoices: [
      [2, 0, 80, 18, -40, 'full', 'sales', 2],
      [4, 1, 10, 12, -70, 'full', 'sales2', 4],
      [1, 3, 10, 18, 12, 'partial', 'sales', 1],
      [3, 2, 20, 18, -9, 'none', 'sales2', 0],
      [6, 4, 8, 18, 21, 'partial', 'manager', 0],
      [0, 4, 4, 18, -14, 'none', 'sales', 1],
    ],
    tasks: [
      ...commonTasks,
      ['CALL', 'Call Lakeview RWA about charger locations', 'sales', 'sales', 0],
      ['EMAIL', 'Send IoT monitoring proposal to Coastal Cold Storage', 'sales2', 'sales2', 2],
      ['TASK', 'Collect site drawings from Sri Venkateshwara', 'manager', 'sales', -1],
      ['MEETING', 'Product demo at Greenfield Villas', 'manager', 'manager', 6],
      ['CALL', 'Payment reminder call to BlueOrbit', 'sales', 'sales', -3, 2],
    ],
    events: [
      ...commonEvents,
      ['EV charger site survey – Lakeview', 'MEETING', 1, 11, 90, 'Lakeview Apartments, Bengaluru', 'sales', []],
      ['Coastal Cold Storage plant visit', 'MEETING', 7, 10, 120, 'Kochi', 'sales2', ['manager']],
    ],
  },
];

/* ============================================================
   HELPERS
============================================================ */

async function call<T = Record<string, any>>(method: string, path: string, token: string | null, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data as T;
}

const days = (n: number, hour = 12) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const list = (body: any): any[] => (Array.isArray(body) ? body : body.items ?? body.data ?? []);
const METHODS = ['UPI', 'CARD', 'CASH', 'BANK_TRANSFER'] as const;

/* ============================================================
   TODAY'S SALES (runs once per day per company)
============================================================ */

const TODAY_WINS: [by: Key, amount: number, what: string][] = [
  ['sales', 86000, 'repeat order'],
  ['sales', 42500, 'counter sale'],
  ['sales2', 128000, 'bulk order'],
  ['manager', 67500, 'key account top-up'],
];

async function seedToday(x: Extra, tokens: Record<Key, string>) {
  const stamp = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const marker = `(${stamp})`;
  const deals = list(await call('GET', '/opportunities?limit=200', tokens.owner));
  if (deals.some(d => String(d.title).endsWith(marker))) {
    console.log(`  today's sales (${stamp}): already present`);
    return;
  }

  const customersOf: Partial<Record<Key, any[]>> = {};
  let invoiced = false;
  for (const [i, [by, amount, what]] of TODAY_WINS.entries()) {
    customersOf[by] ??= list(await call('GET', '/customers?limit=50', tokens[by]));
    const customer = customersOf[by]![i % customersOf[by]!.length];
    if (!customer) continue;

    // Real flow: open a deal, log the call, then win it.
    const deal = await call('POST', '/opportunities', tokens[by], { title: `${customer.name} – ${what} ${marker}`, amount, stage: 'NEGOTIATION', customerId: customer.id, closeDate: days(0, 18) });
    const callLog = await call('POST', '/activities', tokens[by], { type: 'CALL', summary: `Order confirmed on call – ${customer.name}`, customerId: customer.id, dueAt: days(0, 11) });
    await call('PATCH', `/activities/${callLog.id}/complete`, tokens[by], {});
    await call('PATCH', `/opportunities/${deal.id}/stage`, tokens[by], { stage: 'WON' });

    // One of today's orders is billed and paid in full straight away.
    if (!invoiced) {
      const p = list(await call('GET', '/products', tokens[by]))[0];
      const invoice = await call('POST', '/invoices', tokens[by], {
        customerId: customer.id,
        lineItems: [{ productId: p.id, description: p.name, quantity: 4, unitPrice: p.price }],
        taxRate: 5,
        dueDate: days(7),
        notes: `Today's order ${marker}. Paid on delivery.`,
      });
      await call('POST', '/payments', tokens[by], { invoiceId: invoice.id, amount: invoice.total, method: 'UPI', reference: `UTR${Math.floor(1e11 + Math.random() * 9e11)}` });
      invoiced = true;
    }
  }
  console.log(`  today's sales (${stamp}): +${TODAY_WINS.length} deals won, 1 invoice paid, ${TODAY_WINS.length} calls logged`);
}

/* ============================================================
   ONE COMPANY
============================================================ */

async function seedMore(x: Extra, n: number) {
  console.log(`\n=== ${x.name}`);
  const keys = Object.keys(x.logins) as Key[];
  const tokens = {} as Record<Key, string>;
  const ids = {} as Record<Key, string>;

  try {
    for (const k of keys) {
      const [email, password] = x.logins[k];
      tokens[k] = (await call('POST', '/auth/login', null, { email, password })).accessToken;
    }
  } catch {
    console.log('  demo users not found — run "npm run seed:demo" first; skipping');
    return null;
  }

  await seedToday(x, tokens);

  const existing = list(await call('GET', '/products', tokens.owner));
  if (existing.some(p => p.sku === x.products[0][1])) {
    console.log('  extra data already present — nothing to do');
    return null;
  }

  // Everyone fills in their own account details (PATCH /auth/me).
  for (const [i, k] of keys.entries()) {
    const me = await call('PATCH', '/auth/me', tokens[k], { jobTitle: x.jobTitles[k], phone: `+91 9${n}${i}00 5${n}${i}${i}0` });
    ids[k] = me.id;
  }
  const companyId = (await call('GET', '/auth/me', tokens.owner)).companyId as string;

  const productIds = existing.map(p => p.id as string);
  for (const [name, sku, category, price, stockQty] of x.products) {
    productIds.push((await call('POST', '/products', tokens.owner, { name, sku, category, price, stockQty, description: `${category} – demo item` })).id);
  }
  const products = list(await call('GET', '/products', tokens.owner));
  const product = (i: number) => products.find(p => p.id === productIds[i])!;
  console.log(`  products: +${x.products.length}`);

  const customerIds: string[] = [];
  for (const [i, [name, city, owner]] of x.customers.entries()) {
    customerIds.push(
      (await call('POST', '/customers', tokens[owner], { name, email: `accounts@${slug(name)}.in`, phone: `+91 9${n}8${i}5 2${i}${n}${i}4`, address: `Main Road, ${city}` })).id,
    );
  }
  console.log(`  customers: +${customerIds.length}`);

  let converted = 0;
  for (const [i, [name, source, status, assignee]] of x.leads.entries()) {
    const lead = await call('POST', '/leads', tokens[assignee], { name, email: `hello@${slug(name)}.in`, phone: `+91 9${n}7${i}6 1${i}${n}${i}8`, source });
    if (status !== 'NEW') await call('PATCH', `/leads/${lead.id}/status`, tokens[assignee], { status });
    // The second qualified lead goes through the real conversion flow.
    if (status === 'QUALIFIED' && ++converted === 2) {
      await call('POST', `/leads/${lead.id}/convert`, tokens[assignee], { deal: { title: `${name} – first order`, amount: 120000 } });
    }
  }
  console.log(`  leads: +${x.leads.length} (1 converted)`);

  const deals: { id: string; monthsAgo: number }[] = [];
  for (const [title, amount, stage, owner, customer, closeInDays, monthsAgo] of x.deals) {
    const deal = await call('POST', '/opportunities', tokens[owner], { title, amount, stage, customerId: customerIds[customer], closeDate: days(closeInDays) });
    deals.push({ id: deal.id, monthsAgo });
  }
  console.log(`  deals: +${deals.length}`);

  const invoices: { id: string; monthsAgo: number }[] = [];
  for (const [i, [customer, p, quantity, taxRate, dueInDays, pay, by, monthsAgo]] of x.invoices.entries()) {
    const invoice = await call('POST', '/invoices', tokens[by], {
      customerId: customerIds[customer],
      lineItems: [{ productId: productIds[p], description: product(p).name, quantity, unitPrice: product(p).price }],
      taxRate,
      dueDate: days(dueInDays),
      notes: 'Payment by NEFT/UPI within the due date. Thank you for your business.',
    });
    if (pay !== 'none') {
      await call('POST', '/payments', tokens[by], {
        invoiceId: invoice.id,
        amount: pay === 'full' ? invoice.total : Math.round(invoice.total * 0.5),
        method: METHODS[i % METHODS.length],
        reference: `UTR${Math.floor(1e11 + Math.random() * 9e11)}`,
      });
    }
    invoices.push({ id: invoice.id, monthsAgo });
  }
  console.log(`  invoices: +${invoices.length} (with payments)`);

  const done: { id: string; daysAgo: number }[] = [];
  for (const [type, summary, by, assignee, dueInDays, doneDaysAgo, doneBy] of x.tasks) {
    const task = await call('POST', '/activities', tokens[by], { type, summary, dueAt: days(dueInDays, 11), assignedToId: assignee ? ids[assignee] : null });
    if (doneDaysAgo !== undefined) {
      await call('PATCH', `/activities/${task.id}/complete`, tokens[doneBy ?? assignee ?? by], {});
      done.push({ id: task.id, daysAgo: doneDaysAgo });
    }
  }
  console.log(`  tasks: +${x.tasks.length} (${done.length} completed, ${x.tasks.filter(t => t[3] === null).length} general)`);

  for (const [title, type, inDays, hour, minutes, location, by, attendees] of x.events) {
    const startAt = days(inDays, hour);
    await call('POST', '/calendar', tokens[by], {
      title,
      type,
      startAt,
      endAt: new Date(new Date(startAt).getTime() + minutes * 60_000).toISOString(),
      location,
      attendeeIds: attendees.map(k => ids[k]),
    });
  }
  console.log(`  calendar events: +${x.events.length}`);

  return { companyId, deals, invoices, done };
}

/* ============================================================
   SPREAD DATES (the API always stamps "now")
============================================================ */

function monthsBack(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(Math.min(d.getDate(), 20));
  return d;
}

async function spreadDates(seeded: NonNullable<Awaited<ReturnType<typeof seedMore>>>) {
  const db = mongoose.connection.db!;
  const companyId = new Types.ObjectId(seeded.companyId);
  for (const d of seeded.deals) {
    if (d.monthsAgo === 0) continue;
    const at = monthsBack(d.monthsAgo);
    await db.collection('opportunities').updateOne({ _id: new Types.ObjectId(d.id), companyId }, { $set: { createdAt: at, updatedAt: at } });
  }
  for (const i of seeded.invoices) {
    const doc = await db.collection('invoices').findOne({ _id: new Types.ObjectId(i.id), companyId });
    if (!doc) continue;
    const at = i.monthsAgo === 0 ? new Date(doc.createdAt) : monthsBack(i.monthsAgo);
    // Issue date never after the due date: at most 15 days before it.
    const latestIssue = new Date(new Date(doc.dueDate).getTime() - 15 * 86_400_000);
    const issueDate = at < latestIssue ? at : latestIssue;
    await db.collection('invoices').updateOne({ _id: doc._id }, { $set: { createdAt: issueDate, updatedAt: at, issueDate } });
    if (i.monthsAgo > 0) await db.collection('payments').updateMany({ invoiceId: doc._id, companyId }, { $set: { paidAt: at, createdAt: at } });
  }
  // Completed tasks: finished on the stated day (3 pm), so "on time / late" and the 7-day chart are real.
  for (const t of seeded.done) {
    await db.collection('activities').updateOne({ _id: new Types.ObjectId(t.id), companyId }, { $set: { completedAt: new Date(days(-t.daysAgo, 15)) } });
  }
}

async function main() {
  const health = await fetch(`${API}/ready`).catch(() => null);
  if (!health?.ok) throw new Error(`API not ready at ${API} — start the backend first (npm run dev).`);

  await mongoose.connect(env.mongoUri);
  for (const [i, extra] of extras.entries()) {
    const seeded = await seedMore(extra, i + 1);
    if (seeded) await spreadDates(seeded);
  }
  console.log('\nDone. Sign-in details: docs/DEMO_DATA.md');
}

main()
  .catch(err => {
    console.error('[seed-more] failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
