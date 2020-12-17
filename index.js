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
        resolve();
      }
    });

    var dir = path.dirname(filePath);
    var basename = path.basename(filePath);
    var watcher = fs.watch(dir, function (eventType, filename) {
      if (eventType === 'rename' && filename === basename) {
        clearTimeout(timer);
        watcher.close();
        resolve();
      }
    });
  });
}

const readLine = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

(() => {

  try {
    // example web address e.g. https://tapestryjournal.com 
    readLine.question('Enter web address: ', async (url) => {

      const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      });
      const page = await browser.newPage();


      // navigate to URL 
      await page.goto(url);

      // enter login details
      await page.click("aria/Email address");
      await page.type("aria/Email address", process.env.USERNAME);
      await page.click("aria/Password");
      await page.type("aria/Password", process.env.PASSWORD);
      await page.keyboard.press('Enter');

      await page.waitForNavigation();

      readLine.question('Enter observation address: ', async (videolink) => {
        // e.g https://tapestryjournal.com/s/spring-cottage-nursery/observation/5140

        await page.goto(videolink, { waitUntil: 'load' });


        const videoName = await page.evaluate(() => {
          const fileName = 'download-link';

          const el = document.querySelector('video');
          const src = el.querySelector('source').src;

          const downloadLink = document.createElement('a');
          downloadLink.innerText = 'Download Video'
          downloadLink.href = src;
          downloadLink.download = fileName;

          document.querySelector('body').appendChild(downloadLink);

          return fileName;
        });

        await page.click(`[download="${videoName}"]`);

        // await checkExistsWithTimeout(`/Users/dwhite/Downloads/${videoName}`, 10000);

        // await browser.close();
      });
    });
  } catch (error) {
    console.error(error);
  }
})();

