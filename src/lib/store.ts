import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { productAssets } from "./assets";
import { isUploadedImage } from "./uploads";

export type Variant = {
  version: number;
  active: number;
  id: string;
  productId: string;
  size: string;
  color: string;
  stock: number;
};
export type Product = {
  images: string[];
  active: number;
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  material: string;
  image: string;
  color: string;
  featured: number;
  variants: Variant[];
};
export type OrderItem = {
  variantId: string;
  productId: string;
  name: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  image: string;
};
export type Customer = {
  name: string;
  email: string;
  address: string;
  phone: string;
};
export type Status =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
export type Order = {
  id: string;
  number: string;
  status: Status;
  payment: "cod" | "stripe";
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  sessionId?: string;
  checkoutUrl?: string;
};
export type PaymentEvent = {
  id: string;
  orderId: string;
  sessionId: string;
  amount: number;
  currency: string;
  paid: boolean;
};

const seed = [
  [
    "linen-shirt",
    "The everyday linen shirt",
    "Shirts",
    8800,
    "A little structure. A lot of ease. Our signature shirt is cut generously from European flax linen, with a soft collar and mother-of-pearl buttons.",
    "100% European linen",
    "Oat",
    1,
  ],
  [
    "studio-trouser",
    "The studio trouser",
    "Trousers",
    11200,
    "Considered tailoring for unhurried days. A softly pleated front, easy waist and generous straight leg make these trousers your everyday companion.",
    "Organic cotton twill",
    "Clay",
    1,
  ],
  [
    "wrap-dress",
    "The Sunday wrap dress",
    "Dresses",
    14800,
    "From slow mornings to long evenings. An adjustable wrap silhouette in breathable linen, finished with deep pockets and a beautifully draped sleeve.",
    "100% washed linen",
    "Terracotta",
    1,
  ],
  [
    "knit-vest",
    "The gentle knit vest",
    "Knitwear",
    9600,
    "A tactile layer for changing seasons. Knit in small batches with a softly sculpted neckline and relaxed ribbed hem.",
    "Organic cotton knit",
    "Butter",
    1,
  ],
  [
    "cotton-tee",
    "The essential cotton tee",
    "Shirts",
    4800,
    "The simple things, done properly. Substantial organic cotton, a beautiful neckline and a fit that gets better with every wear.",
    "100% organic cotton",
    "Chalk",
    0,
  ],
  [
    "weekend-jacket",
    "The weekend jacket",
    "Outerwear",
    18400,
    "A workwear spirit with a softer touch. Generous patch pockets, a natural corozo button and a shape made for layering.",
    "Cotton and linen canvas",
    "Olive",
    0,
  ],
] as const;

export type Category = { id: string; name: string; active: number };
export type Inquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};
export type ProductDraft = {
  name: string;
  category: string;
  price: number;
  description: string;
  material: string;
  images: string[];
  variants: { id?: string; size: string; color: string; stock: number }[];
};
export class Store {
  private validateProduct(data: ProductDraft) {
    if (!data || typeof data !== "object") throw new Error("Invalid product");
    if (
      typeof data.name !== "string" ||
      data.name.trim().length < 3 ||
      data.name.length > 120
    )
      throw new Error("Invalid product name");
    if (
      !Number.isSafeInteger(data.price) ||
      data.price < 1 ||
      data.price > 1000000
    )
      throw new Error("Invalid price");
    if (!this.categories().some((c) => c.name === data.category))
      throw new Error("Invalid category");
    if (typeof data.description !== "string" || data.description.length > 2000)
      throw new Error("Invalid description");
    if (
      typeof data.material !== "string" ||
      data.material.length < 3 ||
      data.material.length > 120
    )
      throw new Error("Invalid material");
    if (
      !Array.isArray(data.images) ||
      data.images.length < 1 ||
      data.images.length > 6 ||
      data.images.some(
        (i) =>
          typeof i !== "string" ||
          (!productAssets.includes(i) && !isUploadedImage(i)),
      ) ||
      new Set(data.images).size !== data.images.length
    )
      throw new Error("Select 1–6 valid local images");
    if (
      !Array.isArray(data.variants) ||
      !data.variants.length ||
      data.variants.length > 24
    )
      throw new Error("Select 1–24 variants");
    const keys = new Set<string>();
    const ids = new Set<string>();
    for (const v of data.variants) {
      if (v.id) {
        if (typeof v.id !== "string" || v.id.length > 200 || ids.has(v.id))
          throw new Error("Duplicate variant or invalid identifier");
        ids.add(v.id);
      }
      if (
        !v ||
        typeof v.size !== "string" ||
        !["XS", "S", "M", "L", "XL", "XXL", "One size"].includes(v.size)
      )
        throw new Error("Invalid variant size");
      if (
        typeof v.color !== "string" ||
        v.color.trim().length < 2 ||
        v.color.length > 40
      )
        throw new Error("Invalid variant color");
      if (!Number.isSafeInteger(v.stock) || v.stock < 0 || v.stock > 10000)
        throw new Error("Invalid variant stock");
      const key = `${v.size}:${v.color.trim().toLowerCase()}`;
      if (keys.has(key))
        throw new Error("Duplicate size and color combination");
      keys.add(key);
    }
  }
  createProduct(input: unknown): Product {
    const data = input as ProductDraft;
    this.validateProduct(data);
    const id = `${data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${randomBytes(4).toString("hex")}`;
    this.atomic(() => {
      this.db
        .prepare(
          "INSERT INTO products(id,name,category,price,description,material,image,color,featured,images,active) VALUES(?,?,?,?,?,?,?,?,?,?,1)",
        )
        .run(
          id,
          data.name.trim(),
          data.category,
          data.price,
          data.description,
          data.material,
          data.images[0],
          data.variants[0].color,
          0,
          JSON.stringify(data.images),
        );
      for (const v of data.variants)
        this.db
          .prepare(
            "INSERT INTO variants(id,productId,size,color,stock,active) VALUES(?,?,?,?,?,1)",
          )
          .run(
            `${id}-${randomBytes(4).toString("hex")}`,
            id,
            v.size,
            v.color.trim(),
            v.stock,
          );
    });
    return this.product(id)!;
  }
  archiveProduct(id: string, archived: boolean): void {
    const product = this.products(true).find((p) => p.id === id);
    if (!product) throw new Error("Product not found");
    if (
      !archived &&
      !this.categories().some((c) => c.name === product.category)
    )
      throw new Error("Restore this product category first");
    this.db
      .prepare("UPDATE products SET active=? WHERE id=?")
      .run(archived ? 0 : 1, id);
  }
  categories(includeArchived = false): Category[] {
    return this.db
      .prepare(
        `SELECT * FROM categories ${includeArchived ? "" : "WHERE active=1"} ORDER BY rowid`,
      )
      .all()
      .map((row) => ({ ...row })) as Category[];
  }
  createCategory(name: string): Category {
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 60)
      throw new Error("Invalid category name");
    if (
      this.categories(true).some(
        (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
      )
    )
      throw new Error("Category already exists");
    const id = randomBytes(8).toString("hex");
    this.db
      .prepare("INSERT INTO categories VALUES(?,?,1)")
      .run(id, name.trim());
    return { id, name: name.trim(), active: 1 };
  }
  updateCategory(id: string, data: { name?: string; active?: number }): void {
    const c = this.categories(true).find((c) => c.id === id);
    if (!c) throw new Error("Category not found");
    if (
      data.name !== undefined &&
      (typeof data.name !== "string" ||
        data.name.trim().length < 2 ||
        data.name.length > 60 ||
        this.categories(true).some(
          (x) =>
            x.id !== id &&
            x.name.toLowerCase() === data.name!.trim().toLowerCase(),
        ))
    )
      throw new Error("Invalid or duplicate category name");
    if (data.active !== undefined && ![0, 1].includes(data.active))
      throw new Error("Invalid category status");
    this.atomic(() => {
      if (
        data.active === 0 &&
        this.products().some((p) => p.category === c.name)
      )
        throw new Error(
          "Archive or move products before archiving this category",
        );
      if (data.name !== undefined) {
        this.db
          .prepare("UPDATE categories SET name=? WHERE id=?")
          .run(data.name.trim(), id);
        this.db
          .prepare("UPDATE products SET category=? WHERE category=?")
          .run(data.name.trim(), c.name);
      }
      if (data.active !== undefined)
        this.db
          .prepare("UPDATE categories SET active=? WHERE id=?")
          .run(data.active, id);
    });
  }
  contact(input: unknown): void {
    const data = input as { name: string; email: string; message: string };
    if (
      !data ||
      typeof data.name !== "string" ||
      data.name.trim().length < 2 ||
      data.name.length > 120
    )
      throw new Error("Please enter your name");
    if (
      typeof data.email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(data.email) ||
      data.email.length > 200
    )
      throw new Error("Please enter a valid email");
    if (
      typeof data.message !== "string" ||
      data.message.trim().length < 10 ||
      data.message.length > 2000
    )
      throw new Error("Message must contain 10–2000 characters");
    this.db
      .prepare("INSERT INTO inquiries VALUES(?,?,?,?,?)")
      .run(
        randomBytes(12).toString("hex"),
        data.name.trim(),
        data.email.trim().toLowerCase(),
        data.message.trim(),
        new Date().toISOString(),
      );
  }
  inquiries(): Inquiry[] {
    return this.db
      .prepare("SELECT * FROM inquiries ORDER BY createdAt DESC")
      .all()
      .map((row) => ({ ...row })) as Inquiry[];
  }
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),description TEXT NOT NULL,material TEXT NOT NULL,image TEXT NOT NULL,color TEXT NOT NULL,featured INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS variants(id TEXT PRIMARY KEY,productId TEXT NOT NULL REFERENCES products(id),size TEXT NOT NULL,color TEXT NOT NULL,stock INTEGER NOT NULL CHECK(stock>=0));
      CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,number TEXT NOT NULL,key TEXT UNIQUE NOT NULL,fingerprint TEXT NOT NULL,status TEXT NOT NULL,payment TEXT NOT NULL,customer TEXT NOT NULL,items TEXT NOT NULL,subtotal INTEGER NOT NULL,shipping INTEGER NOT NULL,total INTEGER NOT NULL,createdAt TEXT NOT NULL,sessionId TEXT,checkoutUrl TEXT);
      CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,orderId TEXT NOT NULL REFERENCES orders(id));
      CREATE TABLE IF NOT EXISTS sessions(tokenHash TEXT PRIMARY KEY,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS inquiries(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,message TEXT NOT NULL,createdAt TEXT NOT NULL);`);
    if (
      !(
        this.db.prepare("SELECT COUNT(*) AS n FROM products").get() as {
          n: number;
        }
      ).n
    ) {
      this.atomic(() => {
        for (const p of seed) {
          this.db
            .prepare("INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?)")
            .run(
              p[0],
              p[1],
              p[2],
              p[3],
              p[4],
              p[5],
              `/images/${p[0]}.svg`,
              p[6],
              p[7],
            );
          for (const size of ["S", "M", "L", "XL"])
            this.db
              .prepare("INSERT INTO variants VALUES(?,?,?,?,?)")
              .run(`${p[0]}-${size.toLowerCase()}`, p[0], size, p[6], 12);
        }
      });
    }
    const columns = this.db.prepare("PRAGMA table_info(products)").all();
    if (!columns.some((c) => c.name === "active"))
      this.db.exec(
        "ALTER TABLE products ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
      );
    if (!columns.some((c) => c.name === "images")) {
      this.db.exec(
        "ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]'",
      );
      for (const p of this.db.prepare("SELECT id,image FROM products").all())
        this.db
          .prepare("UPDATE products SET images=? WHERE id=?")
          .run(JSON.stringify([p.image]), p.id as string);
    }
    if (
      !this.db
        .prepare("PRAGMA table_info(variants)")
        .all()
        .some((c) => c.name === "active")
    )
      this.db.exec(
        "ALTER TABLE variants ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
      );
    if (
      !this.db
        .prepare("PRAGMA table_info(variants)")
        .all()
        .some((c) => c.name === "version")
    )
      this.db.exec(
        "ALTER TABLE variants ADD COLUMN version INTEGER NOT NULL DEFAULT 0",
      );
    // Replace only untouched original seed galleries, retaining all admin edits.
    this.atomic(() => {
      const update = this.db.prepare(
        "UPDATE products SET image=?,images=? WHERE id=? AND image=? AND images=?",
      );
      for (const product of seed) {
        const original = `/images/${product[0]}.svg`;
        const photograph = `/images/photo-${product[0]}.webp`;
        update.run(photograph, JSON.stringify([photograph]), product[0], original, JSON.stringify([original]));
      }
    });
    for (const p of this.db
      .prepare("SELECT DISTINCT category FROM products")
      .all())
      if (!this.categories(true).some((c) => c.name === p.category))
        this.createCategory(p.category as string);
  }
  close() {
    this.db.close();
  }
  private atomic<T>(operation: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = operation();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  products(includeArchived = false): Product[] {
    return (
      this.db
        .prepare(
          `SELECT * FROM products ${includeArchived ? "" : "WHERE active=1"} ORDER BY rowid`,
        )
        .all() as unknown as Product[]
    ).map((p) => ({
      ...p,
      images: JSON.parse(p.images as unknown as string),
      variants: (
        this.db
          .prepare(
            "SELECT * FROM variants WHERE productId=? AND active=1 ORDER BY rowid",
          )
          .all(p.id) as unknown as Variant[]
      ).map((v) => ({ ...v })),
    }));
  }
  product(id: string) {
    return this.products().find((p) => p.id === id);
  }
  variant(id: string): Variant | undefined {
    return this.db
      .prepare("SELECT * FROM variants WHERE id=?")
      .get(id) as unknown as Variant | undefined;
  }
  private decode(row: Record<string, unknown> | undefined): Order | undefined {
    if (!row) return undefined;
    const { key: _key, fingerprint: _fingerprint, ...safe } = row;
    return {
      ...safe,
      customer: JSON.parse(row.customer as string),
      items: JSON.parse(row.items as string),
    } as Order;
  }
  order(id: string) {
    return this.decode(
      this.db.prepare("SELECT * FROM orders WHERE id=?").get(id),
    );
  }
  orders() {
    return this.db
      .prepare("SELECT * FROM orders ORDER BY createdAt DESC")
      .all()
      .map((row) => this.decode(row)!);
  }
  checkout(data: unknown): Order {
    if (!data || typeof data !== "object") throw new Error("Invalid checkout");
    const d = data as {
      items: { variantId: string; quantity: number }[];
      key: string;
      customer: Customer;
      payment: string;
    };
    if (typeof d.key !== "string" || d.key.length < 16 || d.key.length > 100)
      throw new Error("Invalid checkout key");
    if (!["cod", "stripe"].includes(d.payment))
      throw new Error("Invalid payment method");
    const c = d.customer;
    if (
      !c ||
      typeof c.name !== "string" ||
      c.name.trim().length < 2 ||
      c.name.length > 120
    )
      throw new Error("Please enter your name");
    if (
      typeof c.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) ||
      c.email.length > 200
    )
      throw new Error("Please enter a valid email");
    if (
      typeof c.address !== "string" ||
      c.address.trim().length < 8 ||
      c.address.length > 500
    )
      throw new Error("Please enter a full delivery address");
    if (
      typeof c.phone !== "string" ||
      c.phone.length < 6 ||
      c.phone.length > 40
    )
      throw new Error("Please enter a phone number");
    if (!Array.isArray(d.items) || !d.items.length || d.items.length > 40)
      throw new Error("Your bag is empty or too large");
    const quantities = new Map<string, number>();
    for (const item of d.items) {
      if (!item || typeof item.variantId !== "string")
        throw new Error("Invalid variant");
      if (
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 20
      )
        throw new Error("Invalid quantity (1–20 required)");
      const quantity = (quantities.get(item.variantId) || 0) + item.quantity;
      if (quantity > 20) throw new Error("Invalid quantity (maximum 20)");
      quantities.set(item.variantId, quantity);
    }
    const customer = {
      name: c.name.trim(),
      email: c.email.trim().toLowerCase(),
      address: c.address.trim(),
      phone: c.phone.trim(),
    };
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          items: [...quantities].sort(),
          customer,
          payment: d.payment,
        }),
      )
      .digest("hex");
    return this.atomic(() => {
      const previous = this.db
        .prepare("SELECT * FROM orders WHERE key=?")
        .get(d.key);
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new Error("Idempotency key already used for another checkout");
        return this.decode(previous)!;
      }
      const items: OrderItem[] = [...quantities].map(
        ([variantId, quantity]) => {
          const v = this.variant(variantId);
          if (!v) throw new Error("This variant is unavailable");
          if (v.stock < quantity)
            throw new Error(`Not enough stock for ${v.size}`);
          const p = this.product(v.productId);
          if (!p || !v.active) throw new Error("This variant is unavailable");
          const result = this.db
            .prepare(
              "UPDATE variants SET stock=stock-?,version=version+1 WHERE id=? AND stock>=?",
            )
            .run(quantity, variantId, quantity);
          if (!result.changes)
            throw new Error("Stock changed. Please try again");
          return {
            variantId,
            productId: p.id,
            name: p.name,
            size: v.size,
            color: v.color,
            price: p.price,
            quantity,
            image: p.image,
          };
        },
      );
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const shipping = subtotal >= 15000 ? 0 : 800;
      const id = randomBytes(24).toString("hex");
      const number = `AT-${String((this.db.prepare("SELECT COUNT(*) AS n FROM orders").get() as { n: number }).n + 1001)}`;
      this.db
        .prepare(
          "INSERT INTO orders(id,number,key,fingerprint,status,payment,customer,items,subtotal,shipping,total,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          number,
          d.key,
          fingerprint,
          d.payment === "cod" ? "confirmed" : "pending",
          d.payment,
          JSON.stringify(customer),
          JSON.stringify(items),
          subtotal,
          shipping,
          subtotal + shipping,
          new Date().toISOString(),
        );
      return this.order(id)!;
    });
  }
  private setStatus(id: string, next: Status): Order {
    const order = this.order(id);
    if (!order) throw new Error("Order not found");
    if (order.status === next) return order;
    const transitions: Record<Status, Status[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };
    if (!transitions[order.status].includes(next))
      throw new Error(`Invalid transition: ${order.status} to ${next}`);
    if (
      next === "cancelled" &&
      order.payment === "stripe" &&
      order.status !== "pending"
    )
      throw new Error("Paid Stripe cancellations require a refund workflow");
    if (next === "cancelled")
      for (const item of order.items)
        this.db
          .prepare(
            "UPDATE variants SET stock=stock+?,version=version+1 WHERE id=?",
          )
          .run(item.quantity, item.variantId);
    this.db.prepare("UPDATE orders SET status=? WHERE id=?").run(next, id);
    return this.order(id)!;
  }
  transition(id: string, next: Status) {
    return this.atomic(() => {
      const o = this.order(id);
      if (
        o?.payment === "stripe" &&
        o.status === "pending" &&
        next === "confirmed"
      )
        throw new Error("Payment must be confirmed by Stripe");
      return this.setStatus(id, next);
    });
  }
  attachSession(id: string, session: string, url?: string) {
    return this.atomic(() => {
      const order = this.order(id);
      if (!order || order.payment !== "stripe" || order.status !== "pending")
        throw new Error("Stripe session can only attach to a pending order");
      if (order.sessionId && order.sessionId !== session)
        throw new Error("Another Stripe session is already attached");
      this.db
        .prepare(
          "UPDATE orders SET sessionId=?,checkoutUrl=? WHERE id=? AND status='pending'",
        )
        .run(session, url || order.checkoutUrl || null, id);
      return this.order(id)!;
    });
  }
  paymentEvent(event: PaymentEvent): boolean {
    return this.atomic(() => {
      if (this.db.prepare("SELECT id FROM events WHERE id=?").get(event.id))
        return false;
      const o = this.order(event.orderId);
      if (
        !o ||
        o.payment !== "stripe" ||
        o.sessionId !== event.sessionId ||
        o.total !== event.amount ||
        event.currency !== "usd"
      )
        throw new Error("Payment details do not match the order");
      if (event.paid && o.status === "pending")
        this.setStatus(o.id, "confirmed");
      else if (event.paid && o.status === "cancelled")
        throw new Error(
          "Payment received after cancellation; manual reconciliation required",
        );
      else if (!event.paid && o.status === "pending")
        this.setStatus(o.id, "cancelled");
      this.db.prepare("INSERT INTO events VALUES(?,?)").run(event.id, o.id);
      return true;
    });
  }
  updateProduct(
    id: string,
    data: {
      name?: string;
      price?: number;
      stock?: number;
      description?: string;
      material?: string;
      category?: string;
      images?: string[];
      variants?: {
        id?: string;
        size: string;
        color: string;
        stock?: number;
        version?: number;
      }[];
    },
  ) {
    const existing = this.products(true).find((p) => p.id === id);
    if (!existing) throw new Error("Product not found");
    if (data.stock !== undefined)
      throw new Error(
        "Bulk stock resets are disabled; edit individual stock with its current version",
      );
    if (data.variants !== undefined && !Array.isArray(data.variants))
      throw new Error("Invalid variants");
    const preparedVariants = data.variants?.map((v) => {
      const current = v.id ? this.variant(v.id) : undefined;
      if (v.id && current?.productId !== id)
        throw new Error("Variant does not belong to this product");
      return { ...v, stock: v.stock === undefined ? current?.stock : v.stock };
    });
    const merged = {
      ...existing,
      ...data,
      variants: preparedVariants || existing.variants,
    } as ProductDraft;
    this.validateProduct(merged);
    if (data.variants)
      for (const v of data.variants)
        if (v.id && this.variant(v.id)?.productId !== id)
          throw new Error("Variant does not belong to this product");
    if (
      data.price !== undefined &&
      (!Number.isSafeInteger(data.price) ||
        data.price < 1 ||
        data.price > 1000000)
    )
      throw new Error("Invalid price");
    if (
      data.stock !== undefined &&
      (!Number.isSafeInteger(data.stock) ||
        data.stock < 0 ||
        data.stock > 10000)
    )
      throw new Error("Invalid stock");
    if (
      data.name !== undefined &&
      (typeof data.name !== "string" ||
        data.name.trim().length < 3 ||
        data.name.length > 120)
    )
      throw new Error("Invalid product name");
    if (
      data.description !== undefined &&
      (typeof data.description !== "string" || data.description.length > 2000)
    )
      throw new Error("Invalid description");
    this.atomic(() => {
      for (const v of data.variants || [])
        if (v.id && v.stock !== undefined) {
          if (!Number.isSafeInteger(v.version) || v.version! < 0)
            throw new Error("Current stock version is required");
          const updated = this.db
            .prepare(
              "UPDATE variants SET stock=?,version=version+1 WHERE id=? AND productId=? AND version=?",
            )
            .run(v.stock, v.id, id, v.version!);
          if (!updated.changes)
            throw new Error(
              "Inventory changed. Reload latest stock and try again",
            );
        }
      for (const field of [
        "name",
        "price",
        "description",
        "category",
        "material",
      ] as const)
        if (data[field] !== undefined)
          this.db
            .prepare(`UPDATE products SET ${field}=? WHERE id=?`)
            .run(data[field]!, id);
      if (data.images)
        this.db
          .prepare("UPDATE products SET images=?,image=? WHERE id=?")
          .run(JSON.stringify(data.images), data.images[0], id);
      if (data.variants) {
        this.db
          .prepare("UPDATE variants SET active=0 WHERE productId=?")
          .run(id);
        for (const v of data.variants) {
          if (v.id)
            this.db
              .prepare(
                "UPDATE variants SET size=?,color=?,active=1 WHERE id=? AND productId=?",
              )
              .run(v.size, v.color.trim(), v.id, id);
          else
            this.db
              .prepare(
                "INSERT INTO variants(id,productId,size,color,stock,active) VALUES(?,?,?,?,?,1)",
              )
              .run(
                `${id}-${randomBytes(4).toString("hex")}`,
                id,
                v.size,
                v.color.trim(),
                v.stock!,
              );
        }
        this.db
          .prepare("UPDATE products SET color=? WHERE id=?")
          .run(data.variants[0].color, id);
      }
    });
    return this.products(true).find((p) => p.id === id)!;
  }
}

const globalStore = globalThis as unknown as { atelierStore?: Store };
export function getStore() {
  return (globalStore.atelierStore ??= new Store(
    process.env.DATABASE_PATH || "./data/atelier.sqlite",
  ));
}
export { money } from "./format";
