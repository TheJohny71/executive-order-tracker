import fs from "fs/promises";
import path from "path";

async function resetCSS() {
  const cssPath = path.join(process.cwd(), "src/app/globals.css");
  try {
    await fs.access(cssPath);
    await fs.copyFile(cssPath, `${cssPath}.backup`);
    console.log("✓ CSS backup created");
  } catch (error) {
    console.error("Error creating CSS backup:", error);
  }
}

resetCSS();
