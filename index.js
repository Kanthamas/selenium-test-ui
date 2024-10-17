import { Builder, By, until } from "selenium-webdriver";
import fs from "node:fs";

// Load config data
const readFileConfig = fs.readFileSync("./config.json", "utf-8");

// Initialize values
const config = JSON.parse(readFileConfig);
const BASE_URL = "https://www.saucedemo.com/";
const TAX = 0.08;
const testResults = [];

// Log test results
function logTestResult(action, result, details = []) {
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
						// console.log(`Added ${productName} to cart.`);
						productAdded = true;
						details.push(`Added ${productName} to cart.`);
					}
				} catch (error) {
					console.log(`****\n${product} not found.\n****\n`);
				}
			}

			// If the product was not found on the page, log it
			if (!productAdded) {
				console.log(`****\n${product} not found on the page.\n****\n`);
			}
		}

		logTestResult("Add Products to Cart", "Success", details);
	} catch (error) {
		logTestResult("Add Products to Cart", "Failed", error.message);
		console.error(error);
	}
}

// 3. ลูกค้าตัดสินใจคืนสินค้า Backpack โดยคลิกปุ่ม Remove จากนั้นตรวจสอบสินค้าในตะกร้า หากถูกต้องครบถ้วน ให้คลิกปุ่ม Checkout เพื่อดำเนินการชำระเงิน หากพบสินค้าที่ไม่ต้องการ ให้คลิกปุ่ม Remove เพื่อลบออก

// Helper function to click the shopping cart icon and navigate to cart.html
async function navigateToCart(driver) {
	let details = [];
	try {
		// Find the shopping cart icon and click it
		let cartIcon = await driver.findElement(By.className("shopping_cart_link"));
		await cartIcon.click();
	} catch (error) {
		details.push(`Error clicking shopping cart icon: ${error.message}`);
		logTestResult("Navigate to Cart", "Failed", details);
		console.error(error);
	}
}

// Helper function to remove a product by name (e.g., "Backpack")
async function removeProductByName(driver, productName) {
	let details = [];
	try {
		// Find the item in the shopping cart based on the product name
		let productElement = await driver.findElement(
			By.xpath(
				`//div[contains(@class,'inventory_item_name') and contains(text(), '${productName}')]`
			)
		);
		details.push(`Found product: ${productName}`);

		// Find the "Remove" button associated with the found product
		let removeButton = await productElement.findElement(
			By.xpath(`.//..//..//button[contains(text(),'Remove')]`)
		);

		// Click the "Remove" button
		await removeButton.click();

		details.push(`Removed ${productName} from cart.`);
		logTestResult("Remove Product", "Success", details);
	} catch (error) {
		details.push(`Error removing ${productName}: ${error.message}`);
		logTestResult("Remove Product", "Failed", details);
		console.error(`Error removing ${productName}:`, error);
	}
}

// Helper function to proceed to checkout
async function proceedToCheckout(driver) {
	let details = [];
	try {
		// Find the "Checkout" button and click it
		let checkoutButton = await driver.findElement(By.id("checkout"));

		await checkoutButton.click();

		logTestResult("Proceed to Checkout", "Success");
	} catch (error) {
		details.push(`Error proceeding to checkout: ${error.message}`);
		logTestResult("Proceed to Checkout", "Failed", details);
		console.error(error);
	}
}

// Main function to remove "Backpack" and proceed to checkout
async function handleCartAndCheckout(driver) {
	try {
		// Step 1: Navigate to the cart page
		await navigateToCart(driver);

		// Step 2: Remove the "Backpack"
		await removeProductByName(driver, "Backpack");

		// Step 3: Proceed to checkout
		await proceedToCheckout(driver);
	} catch (error) {
		console.error(error);
	}
}

// 4. กรอกข้อมูลผู้สั่งซื้อ จากนั้นกดปุ่ม Continue เพื่อดำเนินการต่อ

// Helper function to fill in the checkout information
async function fillCheckoutInformation(driver) {
	let details = [];
	try {
		// Fill in first name
		await driver.findElement(By.id("first-name")).sendKeys(config.firstName);

		// Fill in last name
		await driver.findElement(By.id("last-name")).sendKeys(config.lastName);

		// Fill in postal code
		await driver.findElement(By.id("postal-code")).sendKeys(config.postalCode);

		// Click the "Continue" button
		await driver.findElement(By.id("continue")).click();

		logTestResult("Fill Checkout Information", "Success", details);
	} catch (error) {
		details.push(`Error filling checkout information: ${error.message}`);
		logTestResult("Fill Checkout Information", "Failed", details);
		console.error(error);
	}
}

async function handleFillCheckoutInformation(driver) {
	try {
		await fillCheckoutInformation(driver); // Call the function to fill in checkout info
	} catch (error) {
		console.error(error);
	}
}

// 5. ตรวจสอบรายการสินค้าครั้งสุดท้าย และราคารวมว่าถูกต้องทั้งหมดหรือไม่ โดยสินค้ามีการคิดภาษีอยู่ที่ 8% ของราคารวมของสินค้า

async function verifyCheckoutTotals(driver) {
	try {
		// Get subtotal and total from the checkout summary
		const subtotalText = await driver
			.findElement(By.css('[data-test="subtotal-label"]'))
			.getText();
		const totalText = await driver
			.findElement(By.css('[data-test="total-label"]'))
			.getText();
		const taxText = await driver
			.findElement(By.css('[data-test="tax-label"]'))
			.getText();

		// Parse the subtotal and total values from the text (remove the dollar sign)
		const subtotal = parseFloat(subtotalText.replace("Item total: $", ""));
		const total = parseFloat(totalText.replace("Total: $", ""));
		const tax = parseFloat(taxText.replace("Tax: $", ""));

		// Calculate the expected tax and total
		const expectedTax = subtotal * TAX; // 8% tax
		const expectedTotal = subtotal + expectedTax;

		// Verify that the calculated values match the displayed values
		if (
			Math.abs(tax - expectedTax) < 0.01 &&
			Math.abs(total - expectedTotal) < 0.01
		) {
			const details = [
				`Subtotal: $${subtotal.toFixed(2)}`,
				`Total: $${total.toFixed(2)} (Expected: $${expectedTotal.toFixed(
					2
				)}), Tax: $${tax.toFixed(2)} (Expected: $${expectedTax.toFixed(2)})`,
			];
			// console.log("Total and tax are correct.");
			logTestResult("Verify Checkout Totals", "Success", details); // Log success

			// Click the Finish button to proceed
			await driver.findElement(By.css('[data-test="finish"]')).click();
			// console.log("Clicked the Continue button to proceed.");
		} else {
			const details = [
				`Verification failed: Total ($${total.toFixed(
					2
				)}) vs Expected ($${expectedTotal.toFixed(2)}), Tax ($${tax.toFixed(
					2
				)}) vs Expected ($${expectedTax.toFixed(2)})`,
			];
			console.error("Total or tax is incorrect.");
			logTestResult("Verify Checkout Totals", "Failure", details); // Log failure
		}
	} catch (error) {
		const details = [`Error: ${error.message}`];
		logTestResult("Verify Checkout Totals", "Error", details); // Log error
		console.error(error);
	}
}

// 6. หากการสั่งซื้อสำเร็จ จะต้องปรากฏหน้าจอ Thank you for your order!

async function verifyThankYouForYourOrder(driver) {
	let details = [];
	try {
		let thankYouForYourOrder = await driver.findElement(
			By.xpath(`//*[contains(text(), "Thank you for your order!")]`)
		);

		if (thankYouForYourOrder) {
			details.push('"Thank you for your order!" is found on the screen.');
		}
		logTestResult("Verify Thank You Message", "Success", details);
	} catch (error) {
		const details = [`Error: ${error.message}`];
		logTestResult("Verify Thank You Message", "Error", details);
		console.error(error);
	}
}

// 7. แสดง log หรือบันทึกการทำงานของโปรแกรม automate ที่เกิดขึ้น สามารถแสดงในรูปแบบ text file, Json หรือชุด text ที่เป็น test result

// Main function
async function testUI() {
	let driver = await initializeDriver();
	try {
		await login(driver);
		await addProductsToCart(driver);
		await handleCartAndCheckout(driver);
		await handleFillCheckoutInformation(driver);
		await verifyCheckoutTotals(driver);
		await verifyThankYouForYourOrder(driver);
	} catch (error) {
		console.error("Test failed: ", error);
	} finally {
		// Write results to log file
		fs.writeFileSync(
			"./testResults.json",
			JSON.stringify(testResults, null, 2)
		);
		console.log("Tests executed successfully.\n");
		console.log("Test Results:", testResults);
		await driver.quit();
	}
}

testUI();
