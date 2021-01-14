const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

function checkExistsWithTimeout(filePath, timeout) {
  return new Promise(function (resolve, reject) {

    var timer = setTimeout(function () {
      watcher.close();
      reject(new Error('File did not exists and was not created during the timeout.'));
    }, timeout);

    fs.access(filePath, fs.constants.R_OK, function (err) {
      if (!err) {
        clearTimeout(timer);
        watcher.close();
        resolve(`${filePath} exists`);
      }
    });

    var dir = path.dirname(filePath);
    var basename = path.basename(filePath);
    var watcher = fs.watch(dir, function (eventType, filename) {
      if (eventType === 'rename' && filename === basename) {
        clearTimeout(timer);
        watcher.close();
        resolve(`${filename} exists`);
      }
    });
  });
}

const readLine = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

(async () => {

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: false,
      //executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });

    // e.g https://example.com/post/example/5140
    readLine.question('Enter web address: ', async (webAddress) => {

      // extract origin - used for login
      // and then downloading video from post
      const url = new URL(webAddress);

      const page = await browser.newPage();


      // navigate to URL 
      await page.goto(url.origin);

      // enter login details
      await page.click("aria/Email address");
      await page.type("aria/Email address", process.env.USERNAME);
      await page.click("aria/Password");
      await page.type("aria/Password", process.env.PASSWORD);
      await page.keyboard.press('Enter');

      await page.waitForNavigation();


      await page.goto(url.href, { waitUntil: 'load' });


      const { fileName, fileType } = await page.evaluate(async () => {
        const el = document.querySelector('video');
        const { src, type } = el.querySelector('source');

        // filename from src attribute
        const fileUrl = new URL(src);
        const fileName = fileUrl.pathname.substring(fileUrl.pathname.lastIndexOf('/') + 1);

        const downloadLink = document.createElement('a');
        downloadLink.innerText = 'Download Video'
        downloadLink.href = src;
        downloadLink.download = fileName;

        document.querySelector('body').appendChild(downloadLink);

        return { fileName, fileType: type.split('/')[1] };
      });

      await page.click(`[download="${fileName}"]`);

      const res = await checkExistsWithTimeout(`/Users/dwhite/Downloads/${fileName}`, 30000);

      await browser.close();

      process.exit();
    });
  } catch (error) {
    console.error(error);
    await browser.close();
  }
})();

