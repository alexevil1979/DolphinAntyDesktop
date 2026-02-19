import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScenarioStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'screenshot' | 'scroll' | 'evaluate';
  selector?: string;
  value?: string;
  timeout?: number;
}

export interface Scenario {
  id: string;
  name: string;
  steps: ScenarioStep[];
  createdAt: string;
}

export class ScenarioRunner {
  private browser: Browser | null = null;

  async launch(executablePath?: string): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: false,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async runScenario(scenario: Scenario, page?: Page): Promise<void> {
    if (!this.browser && !page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const targetPage = page || (await this.browser!.newPage());

    for (const step of scenario.steps) {
      await this.executeStep(targetPage, step);
    }
  }

  private async executeStep(page: Page, step: ScenarioStep): Promise<void> {
    switch (step.type) {
      case 'navigate':
        if (!step.value) throw new Error('Navigate requires a URL value');
        await page.goto(step.value, { waitUntil: 'networkidle2', timeout: step.timeout || 30000 });
        break;

      case 'click':
        if (!step.selector) throw new Error('Click requires a selector');
        await page.waitForSelector(step.selector, { timeout: step.timeout || 5000 });
        await page.click(step.selector);
        break;

      case 'type':
        if (!step.selector || !step.value) throw new Error('Type requires selector and value');
        await page.waitForSelector(step.selector, { timeout: step.timeout || 5000 });
        await page.type(step.selector, step.value, { delay: 50 + Math.random() * 100 });
        break;

      case 'wait':
        await page.waitForTimeout(step.timeout || 1000);
        break;

      case 'screenshot':
        await page.screenshot({ path: step.value || 'screenshot.png', fullPage: true });
        break;

      case 'scroll':
        await page.evaluate((pixels) => window.scrollBy(0, pixels), parseInt(step.value || '500'));
        break;

      case 'evaluate':
        if (!step.value) throw new Error('Evaluate requires a script value');
        await page.evaluate(step.value);
        break;

      default:
        console.warn(`Unknown step type: ${step.type}`);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
