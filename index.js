import { Builder, By, until } from "selenium-webdriver";
import fs from "node:fs";

// Load config data
const readFileConfig = fs.readFileSync("./config.json", "utf-8");

// Initialize values
const config = JSON.parse(readFileConfig);
const BASE_URL = "https://www.saucedemo.com/";
const testResults = [];

// Log test results
function logTestResult(action, result, details = null) {
	const timestamp = new Date().toISOString();
	testResults.push({ action, result, details, timestamp });
}

// Initailize driver
async function initializeDriver() {
	return new Builder().forBrowser("chrome").build();
}

// 1. เข้าสู่หน้าเว็บ saucedemo และทำการ login ด้วย username/password ตัวอย่างที่เว็บไซต์จัดเตรียมไว้ให้

async function login(driver) {
	try {
		// Navigate to saucedemo website
		await driver.get(BASE_URL);

		// Login with username/password
		await driver.findElement(By.id("user-name")).sendKeys(config.username);
		await driver.findElement(By.id("password")).sendKeys(config.password);
		await driver.findElement(By.id("login-button")).click();

		// Wait for all items are displayed or Timeout 5s
		await driver.wait(
			until.elementsLocated(By.className("inventory_item")),
			5000
		);

		logTestResult("Login", "Success");
	} catch (error) {
		logTestResult("Login", "Failed", error.message);
		console.error(error);
	}
}

// 2. เลือกซื้อสินค้า T-Shirt,flashlight และ Backpack หากพบสินค้าเหล่านี้ ให้คลิกปุ่ม Add to cart เพื่อหยิบใส่รถเข็น หากไม่พบสินค้า โปรแกรมจะดำเนินการต่อไปยังขั้นตอนถัดไป แต่ต้องบันทึกในผลการทดสอบ (test result)

async function addProductsToCart(driver) {
	let details = [];
	try {
		// Get all product elements on the page
		let allProductElements = await driver.findElements(
			By.className("inventory_item")
		);

		// Loop through each product in the config.products array
		for (let product of config.products) {
			let productAdded = false;

			// Loop through all the products displayed on the page
			for (let productElement of allProductElements) {
				try {
					// Extract the product name
					let productNameElement = await productElement.findElement(
						By.className("inventory_item_name")
					);
					let productName = await productNameElement.getText();

					// If the product name matches one from config.products[]
					if (productName.includes(product)) {
						// Find and click the 'Add to cart' button
						let addToCartButton = await productElement.findElement(
							By.xpath(`.//button[contains(text(),'Add to cart')]`)
						);
						await addToCartButton.click();
						console.log(`Added ${productName} to cart.`);
						productAdded = true;
						details.push(`Added ${productName} to cart.`);
					}
				} catch (error) {
					console.log(`${product} not found.`);
				}
			}

			// If the product was not found on the page, log it
			if (!productAdded) {
				console.log(`${product} not found on the page.`);
			}

			// Wait for the inventory items to load (optional)
			await driver.wait(
				until.elementsLocated(By.className("inventory_item")),
				5000
			);
		}

		logTestResult("Add Products to Cart", "Success", details);
	} catch (error) {
		logTestResult("Add Products to Cart", "Failed", error.message);
		console.error(error);
	}
}

// 3. ลูกค้าตัดสินใจคืนสินค้า Backpack โดยคลิกปุ่ม Remove จากนั้นตรวจสอบสินค้าในตะกร้า หากถูกต้องครบถ้วน ให้คลิกปุ่ม Checkout เพื่อดำเนินการชำระเงิน หากพบสินค้าที่ไม่ต้องการ ให้คลิกปุ่ม Remove เพื่อลบออก

// 4. กรอกข้อมูลผู้สั่งซื้อ จากนั้นกดปุ่ม Continue เพื่อดำเนินการต่อ

// 5. ตรวจสอบรายการสินค้าครั้งสุดท้าย และราคารวมว่าถูกต้องทั้งหมดหรือไม่ โดยสินค้ามีการคิดภาษีอยู่ที่ 8% ของราคารวมของสินค้า

// 6. หากการสั่งซื้อสำเร็จ จะต้องปรากฏหน้าจอ Thank you for your order!

// 7. แสดง log หรือบันทึกการทำงานของโปรแกรม automate ที่เกิดขึ้น สามารถแสดงในรูปแบบ text file, Json หรือชุด text ที่เป็น test result

// Main function
async function testUI() {
	let driver = await initializeDriver();
	try {
		await login(driver);
		await addProductsToCart(driver);
	} catch (error) {
		console.log("Test failed: ", error);
	} finally {
		// Write results to log file
		fs.writeFileSync(
			"./testResults.json",
			JSON.stringify(testResults, null, 2)
		);
		console.log("Test Results:", testResults);
		// await driver.quit();
	}
}

testUI();
