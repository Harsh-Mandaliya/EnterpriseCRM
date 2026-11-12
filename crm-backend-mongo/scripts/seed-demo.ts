/**
 * Demo data: two complete companies created through the public API, so
 * every record passes the same validation and permission checks as real
 * use. Running it again skips a company whose owner already exists.
 *
 *   npm run seed:demo                     # API at http://localhost:4000/api/v1
 *   npm run seed:demo -- http://host:4000/api/v1
 *
 * Afterwards, dates are spread over the last six months directly in
 * MongoDB (the API always stamps "now") so charts look realistic. Only
 * records of the two demo companies are touched.
 *
 * Demo passwords are for local testing only — change them before any
 * shared or production use.
 */
import mongoose, { Types } from 'mongoose';

import { env } from '@/config/env';

const API = (process.argv[2] ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');

/* ============================================================
   DEMO COMPANIES
============================================================ */

type Role = 'ADMIN' | 'MANAGER' | 'SALES' | 'EMPLOYEE';

interface DemoUser {
  key: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface DemoCompany {
  name: string;
  code: string;
  owner: { name: string; email: string; password: string };
  users: DemoUser[];
  /** Keys of the users in the manager's team (the other sales rep stays outside). */
  team: { name: string; territory: string; manager: string; members: string[] };
  branding: Record<string, unknown>;
  products: { name: string; sku: string; category: string; price: number; stockQty: number; description: string }[];
  customers: { name: string; email: string; phone: string; gstin?: string; address: string; owner: string }[];
  leads: { name: string; email?: string; phone?: string; source: string; status: string; assignee: string; customer?: number }[];
  deals: { title: string; amount: number; stage: string; owner: string; customer: number; closeInDays: number; monthsAgo: number }[];
  invoices: { customer: number; items: [number, number][]; taxRate: number; dueInDays: number; pay: 'full' | 'partial' | 'none'; by: string; monthsAgo: number }[];
  tasks: { type: string; summary: string; assignee: string; dueInDays: number | null; done?: boolean; lead?: number; customer?: number }[];
  events: { title: string; type: string; inDays: number; hour: number; minutes: number; location: string; customer?: number; by: string }[];
}

const companies: DemoCompany[] = [
  {
    name: 'Shree Ganesh Textiles Pvt Ltd',
    code: 'sg-textiles',
    owner: { name: 'Harsh Mandaliya', email: 'harsh.owner@sgtextiles.com', password: 'Harsh@123456' },
    users: [
      { key: 'admin', name: 'Trusha Patel', email: 'trusha.admin@sgtextiles.com', password: 'Trusha@123456', role: 'ADMIN' },
      { key: 'manager', name: 'Pari Mehta', email: 'pari.manager@sgtextiles.com', password: 'Pari@123456', role: 'MANAGER' },
      { key: 'sales', name: 'Ritik Shah', email: 'ritik.sales@sgtextiles.com', password: 'Ritik@123456', role: 'SALES' },
      { key: 'sales2', name: 'Neha Desai', email: 'neha.sales@sgtextiles.com', password: 'Neha@123456', role: 'SALES' },
      { key: 'employee', name: 'Dhruv Joshi', email: 'dhruv.emp@sgtextiles.com', password: 'Dhruv@123456', role: 'EMPLOYEE' },
    ],
    team: { name: 'Gujarat Sales', territory: 'Gujarat', manager: 'manager', members: ['sales', 'employee'] },
    branding: {
      displayName: 'SG Textiles CRM',
      preset: 'sunset',
      cornerStyle: 'rounded',
      density: 'comfortable',
      colorMode: 'system',
      roleThemes: { SALES: 'emerald' },
      allowUserThemes: true,
    },
    products: [
      { name: 'Cotton Fabric Roll (50 m)', sku: 'SG-COT-50', category: 'Fabric', price: 8500, stockQty: 120, description: '60s count combed cotton, 58" width' },
      { name: 'Silk Saree – Banarasi', sku: 'SG-SLK-BN', category: 'Sarees', price: 12500, stockQty: 40, description: 'Handwoven Banarasi silk with zari border' },
      { name: 'Polyester Blend Roll (50 m)', sku: 'SG-PLY-50', category: 'Fabric', price: 5200, stockQty: 200, description: '65/35 poly-cotton for uniforms' },
      { name: 'School Uniform Set', sku: 'SG-UNI-SET', category: 'Uniforms', price: 950, stockQty: 600, description: 'Shirt + trouser/skirt, sizes 22–40' },
      { name: 'Dyeing & Finishing (per 100 m)', sku: 'SG-SRV-DYE', category: 'Services', price: 3200, stockQty: 0, description: 'Reactive dyeing with colour-fastness report' },
    ],
    customers: [
      { name: 'Patel Garments Co.', email: 'accounts@patelgarments.in', phone: '+91 98250 11223', gstin: '24AABCP1234Q1Z5', address: 'Ring Road, Surat, Gujarat 395002', owner: 'sales' },
      { name: 'Sunrise School Trust', email: 'purchase@sunriseschool.edu.in', phone: '+91 79 2630 4411', address: 'Navrangpura, Ahmedabad, Gujarat 380009', owner: 'sales' },
      { name: 'Kalaniketan Sarees', email: 'orders@kalaniketan.in', phone: '+91 98200 45566', gstin: '27AAFCK5678L1Z2', address: 'Dadar West, Mumbai, Maharashtra 400028', owner: 'sales2' },
      { name: 'Vastra Retail LLP', email: 'buying@vastraretail.com', phone: '+91 99099 77881', gstin: '24AAKFV4321M1Z9', address: 'CG Road, Ahmedabad, Gujarat 380006', owner: 'manager' },
      { name: 'Royal Hotels Group', email: 'procurement@royalhotels.in', phone: '+91 141 222 3344', address: 'MI Road, Jaipur, Rajasthan 302001', owner: 'sales2' },
      { name: 'Om Exports', email: 'info@omexports.co.in', phone: '+91 261 246 8800', gstin: '24AADFO9876K1Z1', address: 'Udhna GIDC, Surat, Gujarat 394210', owner: 'sales' },
    ],
    leads: [
      { name: 'Anjali Boutique', email: 'anjali@anjaliboutique.in', phone: '+91 98765 10001', source: 'REFERRAL', status: 'NEW', assignee: 'sales' },
      { name: 'Green Valley School', email: 'admin@greenvalley.edu.in', phone: '+91 98765 10002', source: 'WEBSITE', status: 'CONTACTED', assignee: 'sales' },
      { name: 'Trendz Fashion Hub', email: 'owner@trendzhub.com', phone: '+91 98765 10003', source: 'SOCIAL_MEDIA', status: 'QUALIFIED', assignee: 'sales' },
      { name: 'Mehta Uniform House', email: 'mehta.uniforms@gmail.com', phone: '+91 98765 10004', source: 'COLD_CALL', status: 'CONTACTED', assignee: 'sales2' },
      { name: 'Lotus Banquet Hall', email: 'events@lotusbanquet.in', phone: '+91 98765 10005', source: 'EVENT', status: 'QUALIFIED', assignee: 'sales2' },
      { name: 'City Hospital Linen Dept', email: 'stores@cityhospital.org', phone: '+91 98765 10006', source: 'REFERRAL', status: 'UNQUALIFIED', assignee: 'sales2' },
      { name: 'Shubh Weddings', email: 'hello@shubhweddings.in', phone: '+91 98765 10007', source: 'SOCIAL_MEDIA', status: 'LOST', assignee: 'sales' },
      { name: 'Navkar Textiles Agency', email: 'navkar.agency@gmail.com', phone: '+91 98765 10008', source: 'WEBSITE', status: 'NEW', assignee: 'manager' },
    ],
    deals: [
      { title: 'Patel Garments – Q4 cotton supply', amount: 425000, stage: 'NEGOTIATION', owner: 'sales', customer: 0, closeInDays: 12, monthsAgo: 1 },
      { title: 'Sunrise School – 600 uniform sets', amount: 570000, stage: 'PROPOSAL', owner: 'sales', customer: 1, closeInDays: 25, monthsAgo: 0 },
      { title: 'Kalaniketan – Banarasi festive stock', amount: 375000, stage: 'WON', owner: 'sales2', customer: 2, closeInDays: -20, monthsAgo: 3 },
      { title: 'Vastra Retail – private label blend', amount: 260000, stage: 'QUALIFICATION', owner: 'manager', customer: 3, closeInDays: 40, monthsAgo: 0 },
      { title: 'Royal Hotels – linen refresh', amount: 310000, stage: 'LOST', owner: 'sales2', customer: 4, closeInDays: -35, monthsAgo: 4 },
      { title: 'Om Exports – dyeing contract', amount: 185000, stage: 'WON', owner: 'sales', customer: 5, closeInDays: -50, monthsAgo: 5 },
      { title: 'Patel Garments – sample batch', amount: 42000, stage: 'PROSPECTING', owner: 'sales', customer: 0, closeInDays: -3, monthsAgo: 2 },
    ],
    invoices: [
      { customer: 2, items: [[1, 20], [4, 5]], taxRate: 5, dueInDays: -60, pay: 'full', by: 'sales2', monthsAgo: 3 },
      { customer: 5, items: [[4, 40]], taxRate: 18, dueInDays: -90, pay: 'full', by: 'sales', monthsAgo: 5 },
      { customer: 0, items: [[0, 30], [2, 10]], taxRate: 5, dueInDays: 15, pay: 'partial', by: 'sales', monthsAgo: 1 },
      { customer: 1, items: [[3, 150]], taxRate: 12, dueInDays: -5, pay: 'none', by: 'sales', monthsAgo: 0 },
      { customer: 3, items: [[2, 25]], taxRate: 5, dueInDays: 30, pay: 'none', by: 'manager', monthsAgo: 0 },
    ],
    tasks: [
      { type: 'CALL', summary: 'Call Green Valley School about uniform sizes', assignee: 'sales', dueInDays: 1, lead: 1 },
      { type: 'TASK', summary: 'Send revised quotation to Patel Garments', assignee: 'sales', dueInDays: -2, customer: 0 },
      { type: 'MEETING', summary: 'Fabric sample review with Trendz Fashion Hub', assignee: 'sales', dueInDays: 3, lead: 2 },
      { type: 'TASK', summary: 'Prepare stock report for festive season', assignee: 'employee', dueInDays: 2 },
      { type: 'EMAIL', summary: 'Share GST invoice copy with Kalaniketan', assignee: 'sales2', dueInDays: null, done: true, customer: 2 },
      { type: 'TASK', summary: 'Quality check on dyeing batch #214', assignee: 'employee', dueInDays: -1 },
    ],
    events: [
      { title: 'Weekly sales review', type: 'MEETING', inDays: 1, hour: 10, minutes: 60, location: 'Surat office – conference room', by: 'manager' },
      { title: 'Demo for Sunrise School trustees', type: 'MEETING', inDays: 4, hour: 15, minutes: 90, location: 'Sunrise School, Ahmedabad', customer: 1, by: 'sales' },
      { title: 'Follow-up call – Vastra Retail', type: 'FOLLOW_UP', inDays: 2, hour: 12, minutes: 30, location: 'Phone', customer: 3, by: 'manager' },
      { title: 'GST return filing deadline', type: 'DEADLINE', inDays: 8, hour: 18, minutes: 15, location: 'Accounts', by: 'admin' },
    ],
  },
  {
    name: 'Nova Electronics Pvt Ltd',
    code: 'nova-electronics',
    owner: { name: 'Aarav Kapoor', email: 'aarav.owner@novaelectronics.com', password: 'Aarav@123456' },
    users: [
      { key: 'admin', name: 'Meera Iyer', email: 'meera.admin@novaelectronics.com', password: 'Meera@123456', role: 'ADMIN' },
      { key: 'manager', name: 'Kabir Singh', email: 'kabir.manager@novaelectronics.com', password: 'Kabir@123456', role: 'MANAGER' },
      { key: 'sales', name: 'Ananya Rao', email: 'ananya.sales@novaelectronics.com', password: 'Ananya@123456', role: 'SALES' },
      { key: 'sales2', name: 'Vikram Nair', email: 'vikram.sales@novaelectronics.com', password: 'Vikram@123456', role: 'SALES' },
      { key: 'employee', name: 'Rohan Verma', email: 'rohan.emp@novaelectronics.com', password: 'Rohan@123456', role: 'EMPLOYEE' },
    ],
    team: { name: 'South Enterprise', territory: 'Bengaluru & Chennai', manager: 'manager', members: ['sales', 'employee'] },
    branding: {
      displayName: 'Nova CRM',
      preset: 'royal',
      primaryColor: '#4338CA',
      accentColor: '#0EA5E9',
      cornerStyle: 'pill',
      density: 'compact',
      colorMode: 'system',
      roleThemes: { SALES: 'graphite' },
      allowUserThemes: false,
    },
    products: [
      { name: 'Smart LED Panel 40W', sku: 'NV-LED-40', category: 'Lighting', price: 2450, stockQty: 800, description: 'App-controlled, 4000K, 5-year warranty' },
      { name: 'Solar Inverter 5 kVA', sku: 'NV-INV-5K', category: 'Power', price: 68500, stockQty: 35, description: 'Hybrid MPPT inverter with Wi-Fi monitoring' },
      { name: 'Industrial IoT Gateway', sku: 'NV-IOT-GW', category: 'IoT', price: 18900, stockQty: 120, description: 'Modbus/MQTT gateway, 4G + Ethernet' },
      { name: 'CCTV Kit (8 cameras)', sku: 'NV-CCTV-8', category: 'Security', price: 42000, stockQty: 60, description: '4 MP cameras, 8-channel NVR, 2 TB' },
      { name: 'Annual Maintenance Contract', sku: 'NV-AMC-1Y', category: 'Services', price: 15000, stockQty: 0, description: 'Quarterly visits + 24h breakdown support' },
    ],
    customers: [
      { name: 'Prestige Tech Park', email: 'facilities@prestigetechpark.in', phone: '+91 80 4110 2200', gstin: '29AABCP4455R1Z3', address: 'Outer Ring Road, Bengaluru, Karnataka 560103', owner: 'sales' },
      { name: 'Chennai Auto Components', email: 'purchase@chennaiauto.co.in', phone: '+91 44 2815 6677', gstin: '33AAECC7788H1Z6', address: 'Ambattur, Chennai, Tamil Nadu 600058', owner: 'sales' },
      { name: 'Greenfield Apartments RWA', email: 'rwa@greenfieldapts.org', phone: '+91 98450 33221', address: 'Whitefield, Bengaluru, Karnataka 560066', owner: 'sales2' },
      { name: 'Hyderabad Pharma Labs', email: 'stores@hydpharma.com', phone: '+91 40 2311 9988', gstin: '36AAFCH2211P1Z4', address: 'Genome Valley, Hyderabad, Telangana 500078', owner: 'manager' },
      { name: 'Coastal Cold Storage', email: 'ops@coastalcold.in', phone: '+91 484 239 4455', address: 'Kakkanad, Kochi, Kerala 682030', owner: 'sales2' },
    ],
    leads: [
      { name: 'Brigade Mall Facilities', email: 'fm@brigademall.in', phone: '+91 90000 20001', source: 'WEBSITE', status: 'NEW', assignee: 'sales' },
      { name: 'Sri Venkateshwara College', email: 'it@svcollege.edu.in', phone: '+91 90000 20002', source: 'REFERRAL', status: 'CONTACTED', assignee: 'sales' },
      { name: 'Mysore Silk Mills', email: 'admin@mysoresilkmills.in', phone: '+91 90000 20003', source: 'EVENT', status: 'QUALIFIED', assignee: 'sales2' },
      { name: 'Techno Warehousing', email: 'ops@technowarehousing.com', phone: '+91 90000 20004', source: 'COLD_CALL', status: 'CONTACTED', assignee: 'sales2' },
      { name: 'Apollo Clinic Whitefield', email: 'admin.wf@apolloclinic.in', phone: '+91 90000 20005', source: 'SOCIAL_MEDIA', status: 'NEW', assignee: 'manager' },
      { name: 'Orion Hotels', email: 'engg@orionhotels.in', phone: '+91 90000 20006', source: 'REFERRAL', status: 'LOST', assignee: 'sales' },
    ],
    deals: [
      { title: 'Prestige Tech Park – LED retrofit (3 towers)', amount: 980000, stage: 'NEGOTIATION', owner: 'sales', customer: 0, closeInDays: 18, monthsAgo: 1 },
      { title: 'Chennai Auto – IoT plant monitoring', amount: 640000, stage: 'PROPOSAL', owner: 'sales', customer: 1, closeInDays: 30, monthsAgo: 0 },
      { title: 'Greenfield RWA – solar backup', amount: 411000, stage: 'WON', owner: 'sales2', customer: 2, closeInDays: -25, monthsAgo: 2 },
      { title: 'Hyderabad Pharma – CCTV & AMC', amount: 285000, stage: 'QUALIFICATION', owner: 'manager', customer: 3, closeInDays: 45, monthsAgo: 0 },
      { title: 'Coastal Cold Storage – IoT sensors', amount: 156000, stage: 'LOST', owner: 'sales2', customer: 4, closeInDays: -40, monthsAgo: 3 },
      { title: 'Prestige Tech Park – AMC renewal', amount: 180000, stage: 'WON', owner: 'sales', customer: 0, closeInDays: -70, monthsAgo: 4 },
    ],
    invoices: [
      { customer: 2, items: [[1, 6]], taxRate: 18, dueInDays: -45, pay: 'full', by: 'sales2', monthsAgo: 2 },
      { customer: 0, items: [[4, 12]], taxRate: 18, dueInDays: -100, pay: 'full', by: 'sales', monthsAgo: 4 },
      { customer: 1, items: [[2, 10], [4, 1]], taxRate: 18, dueInDays: 20, pay: 'partial', by: 'sales', monthsAgo: 1 },
      { customer: 3, items: [[3, 3]], taxRate: 18, dueInDays: -10, pay: 'none', by: 'manager', monthsAgo: 0 },
    ],
    tasks: [
      { type: 'CALL', summary: 'Confirm tower count with Prestige facilities team', assignee: 'sales', dueInDays: 1, customer: 0 },
      { type: 'MEETING', summary: 'Site survey at Chennai Auto plant', assignee: 'sales', dueInDays: 5, customer: 1 },
      { type: 'TASK', summary: 'Prepare IoT proposal for Techno Warehousing', assignee: 'sales2', dueInDays: -3, lead: 3 },
      { type: 'TASK', summary: 'Inventory audit – inverters', assignee: 'employee', dueInDays: 2 },
      { type: 'EMAIL', summary: 'Send installation photos to Greenfield RWA', assignee: 'sales2', dueInDays: null, done: true, customer: 2 },
    ],
    events: [
      { title: 'Quarterly pipeline review', type: 'MEETING', inDays: 2, hour: 11, minutes: 90, location: 'Bengaluru HQ – Board room', by: 'manager' },
      { title: 'Prestige Tech Park negotiation', type: 'MEETING', inDays: 3, hour: 16, minutes: 60, location: 'Prestige Tech Park, Tower B', customer: 0, by: 'sales' },
      { title: 'Call back – Mysore Silk Mills', type: 'CALL', inDays: 1, hour: 14, minutes: 30, location: 'Phone', by: 'sales2' },
      { title: 'Insurance renewal deadline', type: 'DEADLINE', inDays: 10, hour: 17, minutes: 15, location: 'Admin', by: 'admin' },
    ],
  },
];

/* ============================================================
   HTTP HELPERS
============================================================ */

class ApiFailure extends Error {
  constructor(
    public status: number,
    public body: unknown,
    label: string,
  ) {
    super(`${label} → ${status} ${JSON.stringify(body)}`);
  }
}

async function call<T = Record<string, any>>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiFailure(res.status, data, `${method} ${path}`);
  return data as T;
}

const days = (n: number, hour = 12, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

async function login(email: string, password: string) {
  const tokens = await call<{ accessToken: string }>('POST', '/auth/login', null, { email, password });
  return tokens.accessToken;
}

/* ============================================================
   SEED ONE COMPANY
============================================================ */

async function seedCompany(c: DemoCompany) {
  console.log(`\n=== ${c.name}`);

  let ownerToken: string;
  try {
    const reg = await call<{ accessToken: string }>('POST', '/auth/register', null, {
      companyName: c.name,
      ownerName: c.owner.name,
      email: c.owner.email,
      password: c.owner.password,
    });
    ownerToken = reg.accessToken;
  } catch (err) {
    if (err instanceof ApiFailure && err.status === 409) {
      console.log('  owner already exists — skipping this company (already seeded)');
      return null;
    }
    throw err;
  }

  await call('PATCH', '/company/profile', ownerToken, { slug: c.code, timezone: 'Asia/Kolkata', currency: 'INR', locale: 'en-IN' });
  await call('PATCH', '/company/branding', ownerToken, c.branding);
  console.log(`  company code: ${c.code}, theme: ${c.branding.preset}`);

  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const me = await call('GET', '/auth/me', ownerToken);
  ids.owner = me.id;
  tokens.owner = ownerToken;

  for (const u of c.users) {
    const created = await call('POST', '/users', ownerToken, { name: u.name, email: u.email, password: u.password, role: u.role });
    ids[u.key] = created.id;
    tokens[u.key] = await login(u.email, u.password);
  }
  console.log(`  users: owner + ${c.users.length}`);

  await call('POST', '/teams', ownerToken, {
    name: c.team.name,
    territory: c.team.territory,
    managerId: ids[c.team.manager],
    memberIds: c.team.members.map(k => ids[k]),
  });
  console.log(`  team: ${c.team.name}`);

  const productIds: string[] = [];
  for (const p of c.products) productIds.push((await call('POST', '/products', ownerToken, p)).id);
  console.log(`  products: ${productIds.length}`);

  // Customers are created by their owner so ownership is real.
  const customerIds: string[] = [];
  for (const cu of c.customers) {
    const { owner, ...body } = cu;
    customerIds.push((await call('POST', '/customers', tokens[owner], body)).id);
  }
  console.log(`  customers: ${customerIds.length}`);

  const leadIds: string[] = [];
  for (const l of c.leads) {
    const lead = await call('POST', '/leads', tokens[l.assignee], {
      name: l.name,
      email: l.email,
      phone: l.phone,
      source: l.source,
      ...(l.customer !== undefined ? { customerId: customerIds[l.customer] } : {}),
    });
    if (l.status !== 'NEW') await call('PATCH', `/leads/${lead.id}/status`, tokens[l.assignee], { status: l.status });
    leadIds.push(lead.id);
  }
  // One qualified lead goes through the real conversion flow.
  const toConvert = c.leads.findIndex(l => l.status === 'QUALIFIED');
  if (toConvert >= 0) {
    await call('POST', `/leads/${leadIds[toConvert]}/convert`, tokens[c.leads[toConvert].assignee], {
      deal: { title: `${c.leads[toConvert].name} – first order`, amount: 95000 },
    });
  }
  console.log(`  leads: ${leadIds.length} (1 converted to customer + deal)`);

  const dealIds: { id: string; monthsAgo: number }[] = [];
  for (const d of c.deals) {
    const deal = await call('POST', '/opportunities', tokens[d.owner], {
      title: d.title,
      amount: d.amount,
      stage: d.stage,
      customerId: customerIds[d.customer],
      closeDate: days(d.closeInDays),
    });
    dealIds.push({ id: deal.id, monthsAgo: d.monthsAgo });
  }
  console.log(`  deals: ${dealIds.length}`);

  const invoiceIds: { id: string; monthsAgo: number }[] = [];
  for (const inv of c.invoices) {
    const invoice = await call('POST', '/invoices', tokens[inv.by], {
      customerId: customerIds[inv.customer],
      lineItems: inv.items.map(([product, quantity]) => ({
        productId: productIds[product],
        description: c.products[product].name,
        quantity,
        unitPrice: c.products[product].price,
      })),
      taxRate: inv.taxRate,
      dueDate: days(inv.dueInDays),
      notes: 'Payment by NEFT/UPI within the due date. Thank you for your business.',
    });
    if (inv.pay !== 'none') {
      const amount = inv.pay === 'full' ? invoice.total : Math.round(invoice.total * 0.4);
      await call('POST', '/payments', tokens[inv.by], {
        invoiceId: invoice.id,
        amount,
        method: inv.pay === 'full' ? 'BANK_TRANSFER' : 'UPI',
        reference: `UTR${Math.floor(1e11 + Math.random() * 9e11)}`,
      });
    }
    invoiceIds.push({ id: invoice.id, monthsAgo: inv.monthsAgo });
  }
  console.log(`  invoices: ${invoiceIds.length} (with payments)`);

  for (const t of c.tasks) {
    const task = await call('POST', '/activities', tokens[t.assignee], {
      type: t.type,
      summary: t.summary,
      ...(t.dueInDays !== null ? { dueAt: days(t.dueInDays, 11) } : {}),
      ...(t.lead !== undefined ? { leadId: leadIds[t.lead] } : {}),
      ...(t.customer !== undefined ? { customerId: customerIds[t.customer] } : {}),
    });
    if (t.done) await call('PATCH', `/activities/${task.id}/complete`, tokens[t.assignee], {});
  }
  console.log(`  tasks: ${c.tasks.length}`);

  for (const e of c.events) {
    await call('POST', '/calendar', tokens[e.by], {
      title: e.title,
      type: e.type,
      startAt: days(e.inDays, e.hour),
      endAt: new Date(new Date(days(e.inDays, e.hour)).getTime() + e.minutes * 60_000).toISOString(),
      location: e.location,
      ...(e.customer !== undefined ? { customerId: customerIds[e.customer] } : {}),
    });
  }
  console.log(`  calendar events: ${c.events.length}`);

  return { companyId: me.companyId as string, deals: dealIds, invoices: invoiceIds };
}

/* ============================================================
   SPREAD DATES (charts)
============================================================ */

function monthsBack(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(Math.min(d.getDate(), 20));
  return d;
}

async function spreadDates(seeded: { companyId: string; deals: { id: string; monthsAgo: number }[]; invoices: { id: string; monthsAgo: number }[] }) {
  const db = mongoose.connection.db!;
  const companyId = new Types.ObjectId(seeded.companyId);
  for (const d of seeded.deals) {
    if (d.monthsAgo === 0) continue;
    const at = monthsBack(d.monthsAgo);
    await db.collection('opportunities').updateOne({ _id: new Types.ObjectId(d.id), companyId }, { $set: { createdAt: at, updatedAt: at } });
  }
  for (const i of seeded.invoices) {
    if (i.monthsAgo === 0) continue;
    const at = monthsBack(i.monthsAgo);
    await db.collection('invoices').updateOne({ _id: new Types.ObjectId(i.id), companyId }, { $set: { createdAt: at, updatedAt: at } });
    await db.collection('payments').updateMany({ invoiceId: new Types.ObjectId(i.id), companyId }, { $set: { paidAt: at, createdAt: at } });
  }
}

/* ============================================================
   MAIN
============================================================ */

async function main() {
  const health = await fetch(`${API}/ready`).catch(() => null);
  if (!health?.ok) throw new Error(`API not ready at ${API} — start the backend first (npm run dev).`);

  await mongoose.connect(env.mongoUri);
  for (const company of companies) {
    const seeded = await seedCompany(company);
    if (seeded) await spreadDates(seeded);
  }
  console.log('\nDone. Sign-in details: docs/DEMO_DATA.md');
}

main()
  .catch(err => {
    console.error('[seed-demo] failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
