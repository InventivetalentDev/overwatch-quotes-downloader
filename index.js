const request = require("request-promise");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const url = require("url");

// const naming = "quote";
const naming = "file";

async function getHeroes() {
    let heroesPage = await request("https://overwatch.gamepedia.com/Heroes");
    let $ = cheerio.load(heroesPage);
    let heroes = [];
    let first = true;
    $("#mw-content-text > div > table.wikitable > tbody")// Fingers crossed this doesn't break any time soon
        .children()
        .each((i, el) => {
            if (first) {// skip header
                first = false;
                return;
            }
            let $el = $(el);
            let heroCol = $el.children("td:nth-child(2)"); // column with hero name
            let link = heroCol.children().first();// Should be an a with a relative link to the hero page
            let href = link.attr("href");
            heroes.push(href.substr(1));// strip leading slash
        });
    return heroes;
}

async function loadQuotesForHero(hero) {
    let decodedHero = decodeURIComponent(hero);
    decodedHero = decodedHero.replace(/:/g, "_").replace(/\./g, "");
    let p = path.join("out", decodedHero);
    if (!fs.existsSync(p)) {
        fs.mkdirSync(p);

        console.log("Loading Quotes for " + decodedHero + "...");
        try {
            let quotesPage = await request("https://overwatch.gamepedia.com/" + hero + "/Quotes");
            let $ = cheerio.load(quotesPage);
            $("audio").each((i, el) => {
                let $el = $(el);
                let leftCol = $el.parent().prev();
                let quote =leftCol.text();
                let src = $el.attr("src");
                let parsed = url.parse(src);
                let filename ;
                if (naming === "file"||quote.length===0) {
                    filename= decodeURIComponent(path.basename(parsed.pathname))
                }else if(naming==="quote"){
                    filename= quote.replace(/[^0-9a-zA-Z]+/g, "_");
                }else{
                    throw "unknown naming";
                }
                console.log("\"" + filename + "\"");

               try{
                   request(src).pipe(fs.createWriteStream(path.join("out", decodedHero, filename)));
               }catch (e) {
                   console.warn("Error loading quote " + filename + " for " + decodedHero);
                   throw e;
               }
                sleep(1000);
            })
            return true;
        } catch (e) {
            console.warn("Error loading quotes for " + decodedHero);
            console.warn(e);
        }
    }
    return false;
}

function sleep(t) {
    return new Promise(resolve => {
        setTimeout(function () {
            resolve();
        }, t);
    });
}

async function loadAllQuotes() {
    let heroes = await getHeroes()
    for (let hero of heroes) {
        if (await loadQuotesForHero(hero)) {
            await sleep(10000);
        }
    }
}

function doStuff() {
    if (!fs.existsSync("out")) fs.mkdirSync("out");
    loadAllQuotes();
}

doStuff();
