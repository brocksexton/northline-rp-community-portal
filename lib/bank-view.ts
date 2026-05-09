import type { ApeItem, PlayerSave, PropertyLayout, ServerConfig } from '@/lib/ape-data';
import { getCitizenName } from '@/lib/ape-data';
import { itemName, money, statLabel } from '@/lib/format';

export type BankStorageBucket = {
  key: string;
  label: string;
  description: string;
  slots: number;
  filled: number;
};

export type BankItemHolding = {
  label: string;
  count: number;
  estimatedValue: number | null;
  flags: string[];
};

export type BankStatementEntry = {
  label: string;
  detail: string;
  amount: number | null;
  kind: 'balance' | 'cash' | 'storage' | 'notice' | 'income' | 'risk';
};

export type BankView = {
  steamId: string;
  displayName: string;
  hasGameSave: boolean;
  joinedLabel: string;
  balances: {
    cash: number;
    bank: number;
    liquid: number;
    containerCash: number;
    estimatedItems: number;
    estimatedNetWorth: number;
    unvaluedItems: number;
  };
  baseline: {
    startingCash: number;
    startingBank: number;
    startingLiquid: number;
    liquidChange: number;
  };
  storage: BankStorageBucket[];
  topHoldings: BankItemHolding[];
  statement: BankStatementEntry[];
  insights: string[];
  limits: {
    taxRate: number | null;
    rentIntervalSeconds: number | null;
    salaryIntervalSeconds: number | null;
    publicMailboxSlots: number | null;
  };
  properties: {
    savedLayouts: number;
    placedProps: number;
  };
};

type ItemScan = {
  total: number;
  containerCash: number;
  estimatedItems: number;
  unvaluedItems: number;
  holdings: Map<string, BankItemHolding>;
  flags: {
    stolen: number;
    unpaid: number;
    containers: number;
    shopData: number;
  };
};

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function configNumber(config: ServerConfig, key: string): number | null {
  const parsed = Number((config as Record<string, unknown>)[key]);
  return Number.isFinite(parsed) ? parsed : null;
}

function priceOverrides(config: ServerConfig): Record<string, number> {
  const raw = (config as Record<string, unknown>).ItemPriceOverrides;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const output: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) output[key] = amount;
  }
  return output;
}

function priceForItem(item: ApeItem, overrides: Record<string, number>): number | null {
  const path = String(item.PrefabResourcePath ?? '');
  if (!path) return null;
  if (overrides[path] != null) return overrides[path];
  const file = path.split('/').pop()?.replace(/\.prefab$/i, '') ?? '';
  if (file && overrides[file] != null) return overrides[file];
  const label = itemName(path);
  if (overrides[label] != null) return overrides[label];
  return null;
}

function itemFlags(item: ApeItem): string[] {
  const flags: string[] = [];
  const isStolen = Boolean(item.ShopIsStolen);
  const hasShopData = Boolean(item.HasShopData);
  const isPaidFor = Boolean(item.ShopIsPaidFor);
  const hasContainerData = Boolean(item.HasContainerData) || Array.isArray(item.ContainerSlots);
  if (isStolen) flags.push('marked stolen');
  if (hasShopData && !isPaidFor) flags.push('unpaid shop item');
  if (hasContainerData) flags.push('container');
  return flags;
}

function scanItem(item: ApeItem | null | undefined, scan: ItemScan, overrides: Record<string, number>) {
  if (!item) return;
  const stack = Math.max(1, Math.floor(numberOrZero(item.StackCount) || 1));
  const label = itemName(String(item.PrefabResourcePath ?? 'Unknown item'));
  const unitPrice = priceForItem(item, overrides);
  const estimatedValue = unitPrice == null ? null : unitPrice * stack;
  const flags = itemFlags(item);

  scan.total += stack;
  scan.containerCash += numberOrZero(item.ContainerCash);
  if (estimatedValue == null) scan.unvaluedItems += stack;
  else scan.estimatedItems += estimatedValue;
  const isStolen = Boolean(item.ShopIsStolen);
  const hasShopData = Boolean(item.HasShopData);
  const isPaidFor = Boolean(item.ShopIsPaidFor);
  const hasContainerData = Boolean(item.HasContainerData) || Array.isArray(item.ContainerSlots);
  if (isStolen) scan.flags.stolen += stack;
  if (hasShopData && !isPaidFor) scan.flags.unpaid += stack;
  if (hasContainerData) scan.flags.containers += stack;
  if (hasShopData) scan.flags.shopData += stack;

  const existing = scan.holdings.get(label) ?? { label, count: 0, estimatedValue: unitPrice == null ? null : 0, flags: [] };
  existing.count += stack;
  if (estimatedValue == null || existing.estimatedValue == null) existing.estimatedValue = existing.estimatedValue ?? null;
  else existing.estimatedValue += estimatedValue;
  existing.flags = [...new Set([...existing.flags, ...flags])];
  scan.holdings.set(label, existing);

  for (const child of asArray(item.ContainerSlots)) scanItem(child, scan, overrides);
}

function scanItems(player: PlayerSave | null, config: ServerConfig): ItemScan {
  const scan: ItemScan = {
    total: 0,
    containerCash: 0,
    estimatedItems: 0,
    unvaluedItems: 0,
    holdings: new Map(),
    flags: { stolen: 0, unpaid: 0, containers: 0, shopData: 0 },
  };
  if (!player) return scan;
  const overrides = priceOverrides(config);
  const allItems = [
    ...asArray(player.HotbarSlots),
    ...asArray(player.InventorySlots),
    ...asArray(player.EquipmentSlots),
    ...asArray(player.MailboxStorageSlots),
  ];
  for (const item of allItems) scanItem(item, scan, overrides);
  return scan;
}

function filled(items: Array<ApeItem | null> | null | undefined) {
  return asArray(items).filter(Boolean).length;
}

function slotCount(items: Array<ApeItem | null> | null | undefined) {
  return asArray(items).length;
}

function makeStatement(view: Omit<BankView, 'statement'>, scan: ItemScan): BankStatementEntry[] {
  const entries: BankStatementEntry[] = [
    {
      label: 'Bank balance',
      detail: 'Current balance reported by your latest character save.',
      amount: view.balances.bank,
      kind: 'balance',
    },
    {
      label: 'Wallet cash',
      detail: 'Cash currently carried on your character. This is not the same as banked money.',
      amount: view.balances.cash,
      kind: 'cash',
    },
  ];

  if (view.balances.containerCash > 0) {
    entries.push({
      label: 'Container cash',
      detail: 'Cash detected inside item containers or storage-capable inventory objects.',
      amount: view.balances.containerCash,
      kind: 'storage',
    });
  }

  entries.push({
    label: 'Inventory snapshot',
    detail: `${scan.total.toLocaleString()} item${scan.total === 1 ? '' : 's'} found across inventory, hotbar, equipment, mailbox storage, and nested containers.`,
    amount: view.balances.estimatedItems || null,
    kind: 'storage',
  });

  if (view.baseline.startingLiquid > 0) {
    entries.push({
      label: 'Change from starter balance',
      detail: 'Estimated against the configured new-player starting cash and bank balance. This is not a transaction ledger.',
      amount: view.baseline.liquidChange,
      kind: view.baseline.liquidChange >= 0 ? 'income' : 'risk',
    });
  }

  entries.push({
    label: 'Ledger status',
    detail: 'Full purchase, ATM, rent, shop-sale, and transfer records are not stored by the current game data yet.',
    amount: null,
    kind: 'notice',
  });

  return entries;
}

function makeInsights(player: PlayerSave | null, scan: ItemScan, config: ServerConfig): string[] {
  const insights: string[] = [];
  const taxRate = configNumber(config, 'TaxRate');
  if (!player) return ['No character save was found yet. Join the server once, then this page can show your balance snapshot.'];
  if (numberOrZero(player.CashBalance) > numberOrZero(player.BankBalance)) insights.push('You are carrying more cash than you have banked. Consider using an ATM if you do not need it on-hand.');
  if (scan.flags.stolen > 0 || scan.flags.unpaid > 0) insights.push('Some held items are marked stolen or unpaid by game data. Treat them as risky if police search you.');
  if (scan.unvaluedItems > 0) insights.push('Some items cannot be valued yet because the current server data does not publish a complete item price ledger.');
  if (taxRate != null) insights.push(`Current configured sales tax is ${Math.round(taxRate * 100)}%. Mayor policies may change what shops and buyers feel in-game.`);
  if (!insights.length) insights.push('Your current bank snapshot looks straightforward: no risky item flags or unusual storage cash were detected.');
  return insights.slice(0, 4);
}

export function buildBankView(input: { steamId: string; player: PlayerSave | null; config: ServerConfig; layouts: PropertyLayout[] }): BankView {
  const { steamId, player, config, layouts } = input;
  const scan = scanItems(player, config);
  const cash = numberOrZero(player?.CashBalance);
  const bank = numberOrZero(player?.BankBalance);
  const startingCash = configNumber(config, 'StartingCash') ?? 0;
  const startingBank = configNumber(config, 'StartingBank') ?? 0;
  const liquid = cash + bank;
  const viewWithoutStatement = {
    steamId,
    displayName: getCitizenName(player, steamId),
    hasGameSave: Boolean(player),
    joinedLabel: dateLabel(player?.FirstJoinedUtc),
    balances: {
      cash,
      bank,
      liquid,
      containerCash: scan.containerCash,
      estimatedItems: scan.estimatedItems,
      estimatedNetWorth: liquid + scan.containerCash + scan.estimatedItems,
      unvaluedItems: scan.unvaluedItems,
    },
    baseline: {
      startingCash,
      startingBank,
      startingLiquid: startingCash + startingBank,
      liquidChange: liquid - (startingCash + startingBank),
    },
    storage: [
      { key: 'hotbar', label: 'Hotbar', description: 'Items ready for quick use.', slots: slotCount(player?.HotbarSlots), filled: filled(player?.HotbarSlots) },
      { key: 'inventory', label: 'Inventory', description: 'Items carried directly by your character.', slots: slotCount(player?.InventorySlots), filled: filled(player?.InventorySlots) },
      { key: 'equipment', label: 'Equipment', description: 'Equipped clothing, armor, or gear slots when present.', slots: slotCount(player?.EquipmentSlots), filled: filled(player?.EquipmentSlots) },
      { key: 'mailbox', label: 'Mailbox storage', description: 'Public mailbox storage attached to your save.', slots: slotCount(player?.MailboxStorageSlots), filled: filled(player?.MailboxStorageSlots) },
    ].filter((bucket) => bucket.slots > 0 || bucket.filled > 0),
    topHoldings: [...scan.holdings.values()]
      .sort((a, b) => b.count - a.count || (b.estimatedValue ?? -1) - (a.estimatedValue ?? -1) || a.label.localeCompare(b.label))
      .slice(0, 12),
    insights: makeInsights(player, scan, config),
    limits: {
      taxRate: configNumber(config, 'TaxRate'),
      rentIntervalSeconds: configNumber(config, 'RentIntervalSeconds'),
      salaryIntervalSeconds: configNumber(config, 'SalaryIntervalSeconds'),
      publicMailboxSlots: configNumber(config, 'PublicMailboxStorageSlotCount'),
    },
    properties: {
      savedLayouts: layouts.length,
      placedProps: layouts.reduce((sum, layout) => sum + (layout.Items?.length ?? 0), 0),
    },
  } satisfies Omit<BankView, 'statement'>;

  return {
    ...viewWithoutStatement,
    statement: makeStatement(viewWithoutStatement, scan),
  };
}

export function formatBankAmount(amount: number | null): string {
  if (amount == null) return '—';
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${money(Math.abs(amount))}`;
}

export function statementIcon(kind: BankStatementEntry['kind']) {
  switch (kind) {
    case 'balance': return 'fa-solid fa-building-columns';
    case 'cash': return 'fa-solid fa-wallet';
    case 'storage': return 'fa-solid fa-box-archive';
    case 'income': return 'fa-solid fa-arrow-trend-up';
    case 'risk': return 'fa-solid fa-triangle-exclamation';
    default: return 'fa-solid fa-circle-info';
  }
}

export function trackedBankStats(player: PlayerSave | null): Array<{ label: string; value: number }> {
  return Object.entries(player?.TrackedStats ?? {})
    .filter(([key, value]) => !['bank_balance', 'level', 'xp_earned', 'playtime_mins'].includes(key) && Number.isFinite(Number(value)))
    .map(([key, value]) => ({ label: statLabel(key), value: Number(value) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 8);
}
