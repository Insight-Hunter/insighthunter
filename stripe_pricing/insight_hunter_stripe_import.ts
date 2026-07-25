import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";

type CsvRow = Record<string, string>;

type ProductRow = {
  product_name: string;
  product_family: string;
  app: string;
  plan_code: string;
  billing_type: string;
  statement_descriptor_suffix: string;
  description: string;
  active: string;
};

type FeatureRow = {
  feature_code: string;
  feature_name: string;
  app: string;
  product_family: string;
  category: string;
  description: string;
  active: string;
};

type PriceRow = {
  product_name: string;
  plan_code: string;
  interval: "month" | "year";
  currency: string;
  unit_amount: string;
  lookup_key: string;
  price_nickname: string;
  app: string;
  product_family: string;
  active: string;
  notes: string;
};

type PlanFeatureRow = {
  plan_code: string;
  feature_code: string;
  included: string;
  notes: string;
};

type EntitlementMap = Record<string, {
  features: string[];
  feature_details: Array<{
    feature_code: string;
    feature_name: string;
    category: string;
    description: string;
  }>;
}>;

function parseCsv(filePath: string): CsvRow[] {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function isTrue(value: string | undefined): boolean {
  return (value ?? "").toLowerCase() === "true";
}

function req(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing required env var: ${name}');
  return value;
}

function buildEntitlementMap(planFeatures: PlanFeatureRow[], features: FeatureRow[]): EntitlementMap {
  const featureByCode = new Map(features.map((f) => [f.feature_code, f]));
  const out: EntitlementMap = {};

  for (const row of planFeatures) {
    if (!isTrue(row.included)) continue;
    if (!out[row.plan_code]) out[row.plan_code] = { features: [], feature_details: [] };
    out[row.plan_code].features.push(row.feature_code);
    const feature = featureByCode.get(row.feature_code);
    if (feature) {
      out[row.plan_code].feature_details.push({
        feature_code: feature.feature_code,
        feature_name: feature.feature_name,
        category: feature.category,
        description: feature.description,
      });
    }
  }

  for (const plan of Object.keys(out)) {
    out[plan].features = [...new Set(out[plan].features)].sort();
    out[plan].feature_details = out[plan].feature_details
      .filter((f, i, arr) => arr.findIndex((x) => x.feature_code === f.feature_code) === i)
      .sort((a, b) => a.feature_code.localeCompare(b.feature_code));
  }

  return out;
}

async function main() {
  const stripe = new Stripe(req("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-02-25.clover",
  });

  const baseDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const productsCsv = path.join(baseDir, "insight_hunter_products.csv");
  const pricesCsv = path.join(baseDir, "insight_hunter_prices.csv");
  const featuresCsv = path.join(baseDir, "insight_hunter_features.csv");
  const planFeaturesCsv = path.join(baseDir, "insight_hunter_plan_features.csv");
  const entitlementsJson = path.join(baseDir, "insight_hunter_entitlements.json");

  const products = parseCsv(productsCsv) as ProductRow[];
  const prices = parseCsv(pricesCsv) as PriceRow[];
  const features = parseCsv(featuresCsv) as FeatureRow[];
  const planFeatures = parseCsv(planFeaturesCsv) as PlanFeatureRow[];

  const entitlementMap = buildEntitlementMap(planFeatures, features);
  fs.writeFileSync(entitlementsJson, JSON.stringify({
    app: "insight_hunter",
    product_family: "insight_hunter",
    generated_at: new Date().toISOString(),
    plans: entitlementMap,
  }, null, 2));
  console.log('Wrote entitlement map: ${entitlementsJson}');

  const productIdByName = new Map<string, string>();

  for (const row of products) {
    const existing = await stripe.products.search({
      query: 'name:'${row.product_name.replace(/'/g, "\\'")}'',
      limit: 1,
    }).catch(() => ({ data: [] as Stripe.Product[] }));

    let product = existing.data.find((p) => p.name === row.product_name);

    if (!product) {
      product = await stripe.products.create({
        name: row.product_name,
        description: row.description || undefined,
        active: isTrue(row.active),
        statement_descriptor: row.statement_descriptor_suffix || undefined,
        metadata: {
          app: row.app,
          product_family: row.product_family,
          plan_code: row.plan_code,
          billing_type: row.billing_type,
        },
      });
      console.log('Created product: ${row.product_name} -> ${product.id}');
    } else {
      product = await stripe.products.update(product.id, {
        description: row.description || undefined,
        active: isTrue(row.active),
        metadata: {
          ...product.metadata,
          app: row.app,
          product_family: row.product_family,
          plan_code: row.plan_code,
          billing_type: row.billing_type,
        },
      });
      console.log('Updated product: ${row.product_name} -> ${product.id}');
    }

    productIdByName.set(row.product_name, product.id);
  }

  for (const row of prices) {
    if (!row.unit_amount || Number.isNaN(Number(row.unit_amount))) {
      console.log('Skipped price ${row.lookup_key}: missing unit_amount');
      continue;
    }

    const productId = productIdByName.get(row.product_name);
    if (!productId) {
      console.log('Skipped price ${row.lookup_key}: product not found for ${row.product_name}');
      continue;
    }

    const existing = await stripe.prices.search({
      query: 'lookup_key:'${row.lookup_key.replace(/'/g, "\\'")}'',
      limit: 1,
    }).catch(() => ({ data: [] as Stripe.Price[] }));

    if (existing.data.length > 0) {
      console.log('Price exists: ${row.lookup_key} -> ${existing.data[0].id}');
      continue;
    }

    const price = await stripe.prices.create({
      product: productId,
      currency: row.currency,
      unit_amount: Number(row.unit_amount),
      nickname: row.price_nickname || undefined,
      active: isTrue(row.active),
      recurring: { interval: row.interval },
      lookup_key: row.lookup_key,
      metadata: {
        app: row.app,
        product_family: row.product_family,
        plan_code: row.plan_code,
      },
    });

    console.log('Created price: ${row.lookup_key} -> ${price.id}');
  }

  console.log("Entitlement summary:");
  for (const [plan, data] of Object.entries(entitlementMap)) {
    console.log('${plan}: ${data.features.join(", ")}');
  }

  console.log("Done. Products and prices are synced, and insight_hunter_entitlements.json is ready for your Worker app.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
