import { DocumentType, PrismaClient } from "@prisma/client";
import { logger } from "@/utils/logger";

interface MyOrder {
  type: DocumentType;
  number: string;
  link: string | null;
  summary: string | null;
  datePublished: Date;
  category?: string;
  agency?: string;
  title: string;
  statusId: number;
}

interface FetchOrdersResponse {
  orders: MyOrder[];
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const MIN_DATE = new Date("2025-01-01T00:00:00Z");

const prisma = new PrismaClient();

interface CategoryConnect {
  where: { name: string };
  create: { name: string };
}

type OrderCreateData = {
  type: DocumentType;
  number: string;
  title: string;
  summary: string | null;
  datePublished: Date;
  link: string | null;
  statusId: number;
  categories?: {
    connectOrCreate: CategoryConnect[];
  };
  agencies?: {
    connectOrCreate: CategoryConnect[];
  };
};

async function fetchOrders(): Promise<FetchOrdersResponse> {
  return { orders: [] };
}

export class DocumentScheduler {
  private isRunning: boolean;
  private intervalId: NodeJS.Timeout | null;
  private lastCheckTime: Date | null;
  private consecutiveFailures: number;
  private readonly intervalMinutes: number;

  constructor(intervalMinutes = 30) {
    this.isRunning = false;
    this.intervalId = null;
    this.lastCheckTime = null;
    this.consecutiveFailures = 0;
    this.intervalMinutes = intervalMinutes * 60 * 1000;
  }

  public start(): void {
    if (this.isRunning) {
      logger.info("Scheduler is already running");
      return;
    }
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      void this.checkNewDocuments().catch((err) => {
        logger.error("Error in scheduled check:", err);
      });
    }, this.intervalMinutes);

    logger.info(
      `Scheduler started. Will run every ${this.intervalMinutes / 1000} seconds.`,
    );
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info("Scheduler stopped");
  }

  public async manualCheck(): Promise<void> {
    return this.checkNewDocuments();
  }

  private async retryWithDelay<T>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 1) {
        logger.warn(
          `Retrying operation in ${RETRY_DELAY_MS}ms. Retries left: ${retries - 1}`,
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.retryWithDelay(fn, retries - 1);
      }
      throw error;
    }
  }

  private async checkNewDocuments(): Promise<void> {
    try {
      logger.info(
        `Starting document check. Last check: ${this.lastCheckTime?.toISOString() || "N/A"}`,
      );
      this.consecutiveFailures = 0;

      const response = await this.retryWithDelay(() => fetchOrders());
      const latestDocuments = response.orders;

      const relevantDocs = latestDocuments.filter((doc) => {
        const docDate = new Date(doc.datePublished);
        return !isNaN(docDate.getTime()) && docDate >= MIN_DATE;
      });

      const existingDocs = await prisma.order.findMany({
        where: { datePublished: { gte: MIN_DATE } },
        select: { link: true, number: true },
      });

      const existingLinks = new Set(
        existingDocs.map((d) => d.link).filter(Boolean),
      );
      const existingNumbers = new Set(
        existingDocs.map((d) => d.number).filter(Boolean),
      );

      const newDocs = relevantDocs.filter((doc) => {
        return (
          doc.link &&
          !existingLinks.has(doc.link) &&
          doc.number &&
          !existingNumbers.has(doc.number)
        );
      });

      if (newDocs.length === 0) {
        logger.info("No new documents found");
        this.lastCheckTime = new Date();
        return;
      }

      const createdCount = await prisma.$transaction(async (tx) => {
        let count = 0;
        for (const doc of newDocs) {
          const categoriesConnect = doc.category
            ? [
                {
                  where: { name: doc.category },
                  create: { name: doc.category },
                },
              ]
            : [];

          const agenciesConnect = doc.agency
            ? [
                {
                  where: { name: doc.agency },
                  create: { name: doc.agency },
                },
              ]
            : [];

          const orderData: OrderCreateData = {
            type: doc.type,
            number: doc.number,
            title: doc.title,
            summary: doc.summary,
            datePublished: new Date(doc.datePublished),
            link: doc.link,
            statusId: doc.statusId,
            ...(categoriesConnect.length > 0 && {
              categories: {
                connectOrCreate: categoriesConnect,
              },
            }),
            ...(agenciesConnect.length > 0 && {
              agencies: {
                connectOrCreate: agenciesConnect,
              },
            }),
          };

          await tx.order.create({
            data: orderData,
          });
          count++;
        }
        return count;
      });

      logger.info(`Added ${createdCount} new documents`);
      this.lastCheckTime = new Date();
    } catch (error) {
      this.consecutiveFailures++;
      logger.error("Error checking for new documents:", error);

      if (this.consecutiveFailures >= MAX_RETRIES) {
        logger.error("Too many consecutive failures. Stopping scheduler.");
        this.stop();
      }
    }
  }
}

export const documentScheduler = new DocumentScheduler(
  parseInt(process.env.SCHEDULER_INTERVAL_MINUTES ?? "30", 10),
);
