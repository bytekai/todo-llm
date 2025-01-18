import readline from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
type ColumnType = "text" | "checkbox";
type ColumnAlign = "left" | "right" | "center";

interface Column<T> {
  header: string;
  align?: ColumnAlign;
  type?: ColumnType;
  format: (item: T) => string;
}

interface KeyHandler<T> {
  key: string;
  description: string;
  handler: (item: T) => void | Promise<void>;
}

interface InteractiveTableOptions {
  padding?: number;
}

export class CliTable<T> {
  private columns: Column<T>[];
  private items: T[];
  private padding: number;

  constructor(padding = 2) {
    this.columns = [];
    this.items = [];
    this.padding = padding;
  }

  addColumn(column: Column<T>): this {
    this.columns.push({
      type: "text",
      align: "left",
      ...column,
    });
    return this;
  }

  setData(items: T[]): this {
    this.items = items ?? [];
    return this;
  }

  private calculateColumnWidths(): number[] {
    return this.columns.map((col) => {
      const headerLength = col.header.length;
      const dataLength = this.items.reduce((maxLength, item) => Math.max(maxLength, col.format(item).length), 0);
      return Math.max(headerLength, dataLength) + this.padding * 2;
    });
  }

  private formatCell(content: string, width: number, align: ColumnAlign = "left", type: ColumnType = "text"): string {
    let formattedContent = content;

    if (type === "checkbox") {
      formattedContent = content === "✓" ? "[✓]" : "[ ]";
    }

    if (align === "right") {
      return formattedContent.padStart(width);
    } else if (align === "center") {
      const totalPadding = width - formattedContent.length;
      const leftPadding = Math.max(0, Math.floor(totalPadding / 2));
      const rightPadding = Math.max(0, totalPadding - leftPadding);
      return " ".repeat(leftPadding) + formattedContent + " ".repeat(rightPadding);
    }
    return formattedContent.padEnd(width);
  }

  private getHeaderLine(): string {
    const widths = this.calculateColumnWidths();
    return this.columns
      .map((col, i) => this.formatCell(col.header, widths[i], col.align, "text"))
      .join(" ".repeat(this.padding));
  }

  private getSeparatorLine(): string {
    const widths = this.calculateColumnWidths();
    return this.columns.map((_, i) => "-".repeat(widths[i])).join(" ".repeat(this.padding));
  }

  private getDataLine(item: T): string {
    const widths = this.calculateColumnWidths();
    return this.columns
      .map((col, i) => this.formatCell(col.format(item), widths[i], col.align, col.type))
      .join(" ".repeat(this.padding));
  }

  toString(): string {
    if (this.columns.length === 0 || this.items.length === 0) {
      return "No data to display";
    }

    const lines = [
      "",
      this.getHeaderLine(),
      this.getSeparatorLine(),
      ...this.items.map((item) => this.getDataLine(item)),
      "",
    ];

    return lines.join("\n");
  }

  print(): void {
    console.log(this.toString());
  }
}

export class InteractiveTable<T> {
  private columns: Column<T>[];
  private items: T[];
  private selectedIndex: number;
  private keyHandlers: KeyHandler<T>[];
  private isRunning: boolean;
  private readline: readline.Interface = readline.createInterface({ input: process.stdin, output: process.stdout });
  private padding: number;
  private fetchData: () => Promise<T[]>;
  private isLoading: boolean;

  constructor(fetchData: () => Promise<T[]>, options: InteractiveTableOptions = {}) {
    this.columns = [];
    this.items = [];
    this.selectedIndex = 0;
    this.keyHandlers = [];
    this.isRunning = false;
    this.padding = options.padding ?? 2;
    this.fetchData = fetchData;
    this.isLoading = false;

    this.onKey("r", "Refresh data", async () => {
      await this.refresh();
    });
  }

  addColumn(header: string, format: (item: T) => string, align: ColumnAlign = "left", type: ColumnType = "text"): this {
    this.columns.push({ header, format, align, type });
    return this;
  }

  setData(items: T[]): this {
    this.items = items ?? [];
    this.selectedIndex = Math.min(this.selectedIndex, this.items.length - 1);
    return this;
  }

  onKey(key: string, description: string, handler: (item: T) => void | Promise<void>): this {
    this.keyHandlers.push({ key, description, handler });
    return this;
  }

  private calculateColumnWidths(): number[] {
    return this.columns.map((col) => {
      const headerLength = col.header.length;
      const dataLength = this.items.reduce((maxLength, item) => Math.max(maxLength, col.format(item).length), 0);
      return Math.max(headerLength, dataLength) + this.padding * 2;
    });
  }

  private formatCell(content: string, width: number, align: ColumnAlign = "left", type: ColumnType = "text"): string {
    let formattedContent = content;

    if (type === "checkbox") {
      formattedContent = content === "✓" ? "[✓]" : "[ ]";
    }

    if (align === "right") {
      return formattedContent.padStart(width);
    } else if (align === "center") {
      const totalPadding = width - formattedContent.length;
      const leftPadding = Math.max(0, Math.floor(totalPadding / 2));
      const rightPadding = Math.max(0, totalPadding - leftPadding);
      return " ".repeat(leftPadding) + formattedContent + " ".repeat(rightPadding);
    }
    return formattedContent.padEnd(width);
  }

  private renderRow(item: T, isSelected: boolean): string {
    const widths = this.calculateColumnWidths();
    const line = this.columns
      .map((col, i) => this.formatCell(col.format(item), widths[i], col.align, col.type))
      .join(" ".repeat(this.padding));

    if (isSelected) {
      return `\x1b[7m${line}\x1b[0m`;
    }
    return line;
  }

  private renderTable(): void {
    console.clear();
    if (this.isLoading) {
      console.log("\nLoading data...\n");
      return;
    }

    if (this.columns.length === 0 || this.items.length === 0) {
      console.log("No data to display");
      return;
    }

    const widths = this.calculateColumnWidths();
    const header = this.columns
      .map((col, i) => this.formatCell(col.header, widths[i], col.align))
      .join(" ".repeat(this.padding));

    const separator = this.columns.map((_, i) => "-".repeat(widths[i])).join(" ".repeat(this.padding));

    const lines = [
      "",
      header,
      separator,
      ...this.items.map((item, index) => this.renderRow(item, index === this.selectedIndex)),
      "",
      "Navigation: ↑/k: Move up, ↓/j: Move down, q: Quit, r: Refresh, c: Complete, d: Delete",
    ];

    console.log(lines.join("\n"));
  }

  public async refresh(): Promise<void> {
    this.isLoading = true;
    this.renderTable();

    try {
      const newData = await this.fetchData();
      this.setData(newData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      this.isLoading = false;
      this.renderTable();
    }
  }

  async start(): Promise<void> {
    await this.refresh();
    if (this.isRunning || this.items.length === 0) return;

    this.isRunning = true;
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    emitKeypressEvents(process.stdin);

    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    this.renderTable();

    return new Promise((resolve) => {
      const keypressHandler = async (str: string, key: { name: string; ctrl: boolean }) => {
        if (key.name === "q" || (key.ctrl && key.name === "c")) {
          this.isRunning = false;
          rl.close();
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          process.stdin.removeListener("keypress", keypressHandler);
          console.clear();
          resolve();
          return;
        }

        if (key.name === "up" || key.name === "k") {
          this.selectedIndex = Math.max(0, this.selectedIndex - 1);
          this.renderTable();
        } else if (key.name === "down" || key.name === "j") {
          this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + 1);
          this.renderTable();
        }

        const handler = this.keyHandlers.find((h) => h.key === str);
        if (handler) {
          await handler.handler(this.items[this.selectedIndex]);
          this.renderTable();
        }
      };

      process.stdin.on("keypress", keypressHandler);
    });
  }
}
