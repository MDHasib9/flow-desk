"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  AreaChart,
  Area,
} from "recharts";
import {
  Clock3,
  Search,
  Users,
  FolderKanban,
  Receipt,
  CircleDollarSign,
} from "lucide-react";
import { CustomerForm } from "@/components/customer-form";
import { ProjectForm } from "@/components/project-form";
import { TaskForm } from "@/components/task-form";
import { moveTask } from "@/app/(app)/actions";
import { InvoiceForm } from "@/components/invoice-form";

type Kind =
  | "dashboard"
  | "customers"
  | "projects"
  | "tasks"
  | "invoices";

const dashboardDataSchema = z.object({
  customers: z.number(),
  projects: z.number(),
  tasks: z.number(),
  revenue: z.number(),
  outstanding: z.number(),
  revenueByMonth: z.array(
    z.object({
      month: z.string(),
      revenue: z.number(),
    }),
  ),
});

const customerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  status: z.string(),
});

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  deadline: z.string().nullable().optional(),
  customers: z
    .union([
      z.object({ name: z.string() }),
      z.array(z.object({ name: z.string() })),
    ])
    .nullable()
    .optional(),
  project_members: z.array(z.object({ id: z.string() })).optional(),
});

const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  priority: z.string(),
  due_date: z.string().nullable().optional(),
});

const invoiceSchema = z.object({
  id: z.string().uuid(),
  invoice_number: z.string(),
  status: z.string(),
  total: z.union([z.string(), z.number()]).nullable().optional(),
  due_date: z.string().nullable().optional(),
  customers: z
    .union([
      z.object({ name: z.string() }),
      z.array(z.object({ name: z.string() })),
    ])
    .nullable()
    .optional(),
});

const taskBoardSchema = z.object({
  tasks: z.array(taskSchema),
  projects: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
});

const projectBoardSchema = z.object({
  projects: z.array(projectSchema),
  customers: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
});

const invoiceBoardSchema = z.object({
  invoices: z.array(invoiceSchema),
  customers: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;
export type CustomerRecord = z.infer<typeof customerSchema>;
export type ProjectRecord = z.infer<typeof projectSchema>;
export type TaskRecord = z.infer<typeof taskSchema>;
export type InvoiceRecord = z.infer<typeof invoiceSchema>;
export type TaskBoardData = z.infer<typeof taskBoardSchema>;
export type ProjectBoardData = z.infer<typeof projectBoardSchema>;
export type InvoiceBoardData = z.infer<typeof invoiceBoardSchema>;

function Title({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  );
}
function Badge({ children }: { children: string }) {
  const color =
    children === "ACTIVE" ||
    children === "PAID" ||
    children === "DONE" ||
    children === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700"
      : children === "HIGH" || children === "URGENT" || children === "OVERDUE"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      {children.replace("_", " ")}
    </span>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <div>
        <div className="mx-auto grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <FolderKanban size={20} />
        </div>
        <h3 className="mt-4 font-medium">{title}</h3>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">{body}</p>
      </div>
    </div>
  );
}
function Toolbar({
  query,
  onQueryChange,
  placeholder,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-4">
      <label className="flex h-9 max-w-sm items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        <Search size={15} />
        <input
          type="search"
          className="w-full bg-transparent outline-none"
          placeholder={placeholder}
          aria-label={placeholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function Dashboard({ data }: { data: DashboardData }) {
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  return (
    <>
      <Title
        title="Workspace overview"
        description="Live totals from your FlowDesk organization."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total customers", data.customers, Users],
          ["Active projects", data.projects, FolderKanban],
          ["Pending tasks", data.tasks, Clock3],
          ["Revenue", money(data.revenue), CircleDollarSign],
          ["Outstanding", money(data.outstanding), Receipt],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof Users;
          return (
            <article
              key={label as string}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex justify-between text-sm text-zinc-500">
                <span>{label as string}</span>
                <I size={16} />
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {value as string}
              </p>
              <p className="mt-2 text-xs text-zinc-500">Current workspace</p>
            </article>
          );
        })}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-medium">Revenue overview</h2>
          <p className="mt-1 text-sm text-zinc-500">Monthly revenue trend</p>
          <div className="mt-6 h-60">
            <ResponsiveContainer>
              <AreaChart data={data.revenueByMonth}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                />
                <Tooltip />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="#c7d2fe"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-medium">Start here</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Build your workflow in three steps.
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <Link
              href="/customers"
              className="block rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
            >
              1. Add a customer →
            </Link>
            <Link
              href="/projects"
              className="block rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
            >
              2. Create a project →
            </Link>
            <Link
              href="/tasks"
              className="block rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
            >
              3. Add tasks →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
function Customers({ items }: { items: CustomerRecord[] }) {
  const [query, setQuery] = useState("");
  const filteredItems = items.filter((customer) =>
    [customer.name, customer.email, customer.company, customer.status]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query.trim().toLowerCase())),
  );
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage the companies and people you work with.
          </p>
        </div>
        <CustomerForm />
      </div>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search customers"
      />
      {filteredItems.length === 0 ? (
        <Empty
          title={items.length ? "No matching customers" : "No customers yet"}
          body={
            items.length
              ? "Try a different name, company, or status."
              : "Add your first customer to start building relationships."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="p-4 font-medium">Customer</th>
                <th className="hidden p-4 font-medium md:table-cell">
                  Company
                </th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                >
                  <td className="p-4">
                    <Link href={`/customers/${c.id}`}>
                      <b className="block font-medium">{c.name}</b>
                      <span className="text-xs text-zinc-500">{c.email}</span>
                    </Link>
                  </td>
                  <td className="hidden p-4 text-zinc-600 md:table-cell">
                    {c.company ?? "—"}
                  </td>
                  <td className="p-4">
                    <Badge>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function Projects({ data }: { data: ProjectBoardData }) {
  const [query, setQuery] = useState("");
  const filteredItems = data.projects.filter((project) => {
    const customer = Array.isArray(project.customers)
      ? project.customers[0]?.name
      : project.customers?.name;
    return [project.name, project.status, customer, project.deadline]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query.trim().toLowerCase()));
  });
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Coordinate work, people, and deadlines.
          </p>
        </div>
        <ProjectForm customers={data.customers} />
      </div>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search projects"
      />
      {filteredItems.length === 0 ? (
        <Empty
          title={
            data.projects.length ? "No matching projects" : "No projects yet"
          }
          body={
            data.projects.length
              ? "Try a different project, customer, or status."
              : "Create a project, add work, and bring your team together."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredItems.map((p) => (
            <article
              key={p.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Badge>{p.status}</Badge>
              <h2 className="mt-5 font-semibold">{p.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {p.customers
                  ? Array.isArray(p.customers)
                    ? p.customers[0]?.name ?? "No customer attached"
                    : p.customers.name
                  : "No customer attached"}
              </p>
              <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
                <span>{p.deadline ? `Due ${p.deadline}` : "No deadline"}</span>
                <span className="text-xs text-zinc-500">
                  {p.project_members?.length ?? 0} members
                </span>
              </div>
              <div className="mt-5 flex justify-end">
                <Link
                  href={`/projects/${p.id}`}
                  className="text-xs font-medium text-indigo-600"
                >
                  Open project →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
function Tasks({
  data,
}: {
  data: TaskBoardData;
}) {
  const labels = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
  const [drag, setDrag] = useState<string | null>(null);
  const [local, setLocal] = useState(data.tasks);
  const [actionError, setActionError] = useState<string | null>(null);
  const drop = async (status: (typeof labels)[number]) => {
    if (!drag) return;
    const previous = local;
    setLocal((x) => x.map((t) => (t.id === drag ? { ...t, status } : t)));
    const result = await moveTask(drag, status);
    if (!result.ok) {
      setLocal(previous);
      setActionError(result.message);
    } else {
      setActionError(null);
    }
    setDrag(null);
  };
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drag work across the board as it moves forward.
          </p>
        </div>
        <TaskForm projects={data.projects} />
      </div>
      {actionError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {actionError}
        </p>
      )}
      {data.projects.length === 0 ? (
        <Empty
          title="Create a project first"
          body="Tasks belong to a project. Create one to start planning work."
        />
      ) : (
        <div className="grid min-w-[900px] grid-cols-4 gap-4 overflow-x-auto pb-4">
          {labels.map((status) => {
            const list = local.filter((t) => t.status === status);
            return (
              <section
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(status)}
                className="rounded-xl bg-zinc-100/80 p-3 dark:bg-zinc-900"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-300">
                    {status.replace("_", " ")}
                  </span>
                  <span className="grid size-5 place-items-center rounded bg-white text-[10px] text-zinc-500 dark:bg-zinc-800">
                    {list.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {list.map((t) => (
                    <article
                      draggable
                      onDragStart={() => setDrag(t.id)}
                      key={t.id}
                      className="cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <Badge>{t.priority}</Badge>
                      <h3 className="mt-3 text-sm font-medium leading-5">
                        <Link href={`/tasks/${t.id}`} className="hover:text-indigo-600">
                          {t.title}
                        </Link>
                      </h3>
                      <div className="mt-4 text-xs text-zinc-500">
                        {t.due_date ? `Due ${t.due_date}` : "No due date"}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
function Invoices({ data }: { data: InvoiceBoardData }) {
  const [query, setQuery] = useState("");
  const filteredInvoices = data.invoices.filter((invoice) => {
    const customer = Array.isArray(invoice.customers)
      ? invoice.customers[0]?.name
      : invoice.customers?.name;
    return [
      invoice.invoice_number,
      invoice.status,
      invoice.due_date,
      customer,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query.trim().toLowerCase()));
  });
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track billing and keep cashflow moving.
          </p>
        </div>
        <InvoiceForm customers={data.customers} />
      </div>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search invoices"
      />
      {filteredInvoices.length === 0 ? (
        <Empty
          title={
            data.invoices.length ? "No matching invoices" : "No invoices yet"
          }
          body={
            data.invoices.length
              ? "Try a different invoice number, customer, or status."
              : "Create an invoice from a customer to start tracking revenue."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="p-4">Invoice</th>
                <th className="p-4">Customer</th>
                <th className="hidden p-4 sm:table-cell">Due date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((i) => (
                <tr
                  key={i.id}
                  className="border-b last:border-0 dark:border-zinc-800"
                >
                  <td className="p-4 font-medium">
                    <Link href={`/invoices/${i.id}`}>{i.invoice_number}</Link>
                  </td>
                  <td className="p-4 text-zinc-600">
                    {i.customers
                      ? Array.isArray(i.customers)
                        ? i.customers[0]?.name ?? "—"
                        : i.customers.name
                      : "—"}
                  </td>
                  <td className="hidden p-4 text-zinc-500 sm:table-cell">
                    {i.due_date ?? "—"}
                  </td>
                  <td className="p-4">
                    <Badge>{i.status}</Badge>
                  </td>
                  <td className="p-4 text-right font-medium">
                    ${Number(i.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
const defaultDashboardData: DashboardData = {
  customers: 0,
  projects: 0,
  tasks: 0,
  revenue: 0,
  outstanding: 0,
  revenueByMonth: [],
};

export function WorkspacePage({
  kind,
  data,
}: {
  kind: Kind;
  data?:
    | DashboardData
    | CustomerRecord[]
    | ProjectBoardData
    | TaskBoardData
    | InvoiceBoardData;
}) {
  if (kind === "dashboard")
    return <Dashboard data={dashboardDataSchema.parse(data ?? defaultDashboardData)} />;

  if (kind === "customers") {
    const rows = Array.isArray(data) ? customerSchema.array().parse(data) : [];
    return <Customers items={rows} />;
  }

  if (kind === "projects") {
    const rows =
      data && typeof data === "object" && "projects" in data
        ? projectBoardSchema.parse(data)
        : { projects: [], customers: [] };
    return <Projects data={rows} />;
  }

  if (kind === "tasks") {
    const rows =
      data && typeof data === "object" && "tasks" in data
        ? taskBoardSchema.parse(data)
        : { tasks: [], projects: [] };
    return <Tasks data={rows} />;
  }

  if (kind === "invoices") {
    const rows =
      data && typeof data === "object" && "invoices" in data
        ? invoiceBoardSchema.parse(data)
        : { invoices: [], customers: [] };
    return <Invoices data={rows} />;
  }
}
