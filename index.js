// const fs = require("fs");
const fs = require("fs-extra");
const marked = require("marked");
const readline = require("readline");
const diacritics = require("diacritics");
const path = require("path");
const cheerio = require("cheerio");
const markdownFolder = "./markdown/new";
const moveToFolder = "./markdown/old";
const htmlFolder = "./html";
const articlesJsonFile = "./articles.json";
const markdownFiles = fs.readdirSync(markdownFolder);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function moveMarkdownFiles() {
  for (const markdownFile of markdownFiles) {
    if (markdownFile.endsWith(".md")) {
      const sourcePath = path.join(markdownFolder, markdownFile);
      const destinationPath = path.join(moveToFolder, markdownFile);
      fs.moveSync(sourcePath, destinationPath, { overwrite: true });
    }
  }
}

// generate html files from markdown
function generateHTMLFiles() {
  rl.question("Generate HTML files (y/n)? ", (answer) => {
    if (answer.toLowerCase() === "y" && markdownFiles.length > 0) {
      for (const markdownFile of markdownFiles) {
        if (markdownFile.endsWith(".md")) {
          const md = fs.readFileSync(`${markdownFolder}/${markdownFile}`, {
            encoding: "utf8",
            flag: "r",
          });

          const articleContent = marked.parse(md);
          fs.writeFileSync(
            `${htmlFolder}/${markdownFile.split(".")[0]}.html`,
            articleContent,
            "utf-8"
          );
        }
      }

      moveMarkdownFiles();
      console.log("HTML files generated.");
    } else {
      console.log("No HTML files generated.");
    }

    generateArticlesJSON();
  });
}

// generate the json file with all articles details in it
function generateArticlesJSON() {
  rl.question("Generate the articles.json file (y/n)? ", (answer) => {
    const htmlFiles = fs.readdirSync(htmlFolder);

    if (answer.toLowerCase() === "y" && htmlFiles.length > 0) {
      const articles = [];

      function createSlug(inputString) {
        // Remove non-alphanumeric characters except for spaces
        const cleanedString = diacritics
          .remove(inputString)
          .replace(/[^a-zA-Z0-9\s]/g, "");
        // Replace spaces with hyphens and convert to lowercase
        const slug = cleanedString.trim().replace(/\s+/g, "-").toLowerCase();
        return slug;
      }

      for (const htmlFile of htmlFiles) {
        if (htmlFile.endsWith(".html")) {
          const filePath = path.join(htmlFolder, htmlFile);
          const fileStats = fs.statSync(filePath);
          const htmlString = fs.readFileSync(filePath);
          const htmlSource = cheerio.load(htmlString);
          const title = htmlSource("h1:first").text();
          const category = htmlSource("h3:first").text();
          const cleanedTitle = createSlug(title);
          const descriptionText = htmlSource("p:eq(1)").text().slice(0, 150);
          const imageSrc = htmlSource("p:eq(0) > img").attr("src");
          articles.push({
            filename: htmlFile,
            title: title,
            category: category,
            description: descriptionText,
            slug: cleanedTitle,
            image: imageSrc,
            dateModified: fileStats.mtime,
          });

          const formattedDate = fileStats.mtime.toLocaleDateString("pt-BR", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          // Try to get the dateModified element
          const existingDateModified = htmlSource("p.date-modified");

          // remove the element if it already exists
          if (existingDateModified.length > 0) {
            existingDateModified.remove();
          }

          // Add the dateModified information after the h1 title
          const dateModifiedElement = `<p class="date-modified">Modificado em: ${formattedDate}</p>`;
          htmlSource("body").append(dateModifiedElement);
          fs.writeFileSync(filePath, htmlSource.html());
        }
      }

      // Sort articles array in ascending order based on dateModified
      articles.sort((a, b) => b.dateModified - a.dateModified);
      fs.writeFileSync(articlesJsonFile, JSON.stringify(articles));
      console.log("articles.json file generated.");
    } else {
      console.log("No articles.json file generated.");
    }

    rl.close();
  });
}

generateHTMLFiles();
