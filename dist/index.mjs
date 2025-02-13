import e from "@sparticuz/chromium";
import t from "puppeteer-core";
var n = async (o) => {
  let r = null;
  try {
    return (
      (e.setHeadlessMode = !0),
      (e.setGraphicsMode = !1),
      (r = await t.launch({
        args: e.args,
        defaultViewport: e.defaultViewport,
        executablePath: await e.executablePath(),
        headless: e.headless,
        ignoreHTTPSErrors: !0,
      })),
      {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: !0,
          message: "Scraping completed successfully",
        }),
      }
    );
  } catch (s) {
    return (
      console.error("Error:", s),
      {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: !1,
          message: "Scraping failed",
          error: s.message,
        }),
      }
    );
  } finally {
    r !== null && (await r.close());
  }
};
export { n as handler };
