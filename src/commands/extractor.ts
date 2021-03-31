// Dependencies
import { O_RDONLY } from "constants";
import { privateEncrypt } from "crypto";
import { Telegraf, Context, Extra } from "telegraf";
import { convertCompilerOptionsFromJson } from "typescript";
const ndl = require('needle');
const chr = require('cheerio');
const telegraph = require('telegraph-node')
const smmry = require('smmry')({
    SM_API_KEY: process.env.SMMRY_TOKEN,
    SM_LENGTH: 3,
    SM_WITH_BREAK: true
});


const { Translate } = require('@google-cloud/translate').v2;
const tokenPath = './google_api.json';
process.env.GOOGLE_APPLICATION_CREDENTIALS = tokenPath;
const translate = new Translate();

const ncbi_url = "https://www.ncbi.nlm.nih.gov/".match('^https?:\/\/[^#?\/]+')[0]
const pubmed_url = "https://pubmed.ncbi.nlm.nih.gov/".match('^https?:\/\/[^#?\/]+')[0]
const nature_url = "https://www.nature.com/".match('^https?:\/\/[^#?\/]+')[0]

// Dependencies
import { Article, findArticle } from '../models'
import { createArticle } from '../models'
import { deleteArticle } from '../models'
import { countArticles } from '../models'

async function articleEntry(id) {
    const dbarticle = await findArticle(id)
    return dbarticle
}

async function pushArticleEntry(ob: Article) {
    const dbarticle = await createArticle(ob)
    return dbarticle
}

async function deleteArticleEntry(ob: Article) {
    const dbarticle = await deleteArticle(ob)
    return dbarticle
}

async function countEntries() {
    const db_nr = await countArticles()
    return db_nr
}


class Extractor {
    all = []
    text = []
    root = undefined
    extract = function (prnt, object, key, searched) {
        Object.keys(object).forEach(function trav(dict_key) {
            if (object[dict_key] && object[dict_key] === key && object.value.includes(searched)) {
                this.all.push([object.value, prnt])
            }

            if (object[dict_key] && typeof object[dict_key] === 'object') {
                let fnd_vals = findPMCVal(object, object[dict_key], key, searched);
                this.all = this.all.concat(fnd_vals)
            }
        }, this)
    }

    getRoot = function (object, key) {
        Object.keys(object).forEach(function trav(dict_key) {
            if (object[dict_key] && object[dict_key] === key) {
                this.root = object
                return
            }

            if (object[dict_key] && typeof object[dict_key] === 'object') {
                this.getRoot(object[dict_key], key);
            }
        }, this)
    }

    extractText = function (object) {
        Object.keys(object).forEach(function trav(dict_key) {
            if (object[dict_key] && object[dict_key] === 'p') {
                this.text.push(object.value)
            }

            if (object[dict_key] && typeof object[dict_key] === 'object') {
                this.extractText(object[dict_key]);
            }
        }, this)
    }
}

function findPMCVal(prnt, object, key, searched) {
    var alls = [];

    const obj = new Extractor();
    obj.extract(prnt, object, key, searched)
    alls = obj.all

    return alls;
}

function findPubmedID(site_body, base_url) {
    if (base_url == ncbi_url) {
        let pm_id = site_body('div[class="fm-citation-pmid"]').text().split(': ')[1]
        if (pm_id == undefined)
            pm_id = ''
        return pm_id
    }
    if (base_url == pubmed_url) {
        let pm_id = site_body('strong[class="current-id"]').first().text()
        if (pm_id == undefined)
            pm_id = ''

        return pm_id
    }
    if (base_url == nature_url) {
        var nature_id = site_body('p[class="c-bibliographic-information__citation"]').text()
        nature_id = nature_id.match(/\bhttps?:\/\/\S+/gi)[0]
        nature_id = nature_id.substring(8)
        nature_id = nature_id.replace('.org','')
        return nature_id
    }
    return undefined
}

async function translateText(sourceText) {
    let translations = await translate.translate(sourceText, "ru");
    return translations
}

function findVal(object, key) {
    var value;
    Object.keys(object).some(function (k) {
        if (object[k] && object[k] === key) {
            value = object;
            return true;
        }
        if (object[k] && typeof object[k] === 'object') {
            value = findVal(object[k], key);
            return value !== undefined;
        }
    });
    return value;
}

async function getAbstractsFromPubmed(ob: Article) {
    let pbmd_id=ob.api_key
    const db_url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pbmd_id}&retmode=xml`

    var abstract = ""
    var title = ""
    let html = await ndl('get', db_url)
    const abstract_info = findVal(html.body, 'Abstract')
    if (abstract_info !== undefined) {
        title = findVal(html.body, 'ArticleTitle').value
        abstract_info.children.forEach(element => {
            abstract += element.value + "\n\n"
        });
    }
    return [title, ['Abstract', abstract]]
}

async function getAbstractsFromNature(ob: Article) {
    let nature_doi = ob.api_key
    
    const db_url = `http://api.springernature.com/metadata/json/${nature_doi}?api_key=${process.env.NATURE_TOKEN}`

    var abstract = ""
    var title = ""
    let html = await ndl('get', db_url)
    return [html.body.records[0].title, ['Abstract',html.body.records[0].abstract]]
}

async function summarizeText(text: string): Promise<string> {
    let data = await smmry.summarizeText(text)
    var summary = data.sm_api_content
    summary = summary.replace(/\[BREAK\] /g, '\n')
    summary = summary.replace(/\[BREAK\]/g, '\n')
    return summary.toString()
}

async function getArticleInfo(ob: Article) {
    var summarisedText: string = ''
    var translatedText: string = ''
    var title = ''
    var abstract_info = ''
    
    if (ob.source == 'pubmed') {
        let abstract_inf = await getAbstractsFromPubmed(ob)
        abstract_info = abstract_inf[1][1]
        title = abstract_inf[0].toString()
    }
    else if (ob.source == 'nature')
    {
        let abstract_inf = await getAbstractsFromNature(ob)
        abstract_info = abstract_inf[1][1]
        title = abstract_inf[0].toString()
    }

    if (abstract_info !== '') {
        try {
            summarisedText = await summarizeText(abstract_info)
        } catch (err) {
            if (err.toString().includes('TEXT IS TOO SHORT')) {
                summarisedText = abstract_info
            }
            else {
                console.log(err)
                summarisedText = 'System error'
            }
        }
        try {
            translatedText = await translateText(summarisedText)
            translatedText = translatedText[0]
        } catch (err) {
            console.log(err)
            translatedText = 'System error'
        }
    }
    return [title, abstract_info, summarisedText, translatedText]
}

async function updateDBEntry(ob: Article, api_key: string, source:string) {
    ob.api_key = api_key
    ob.source = source
    
    let info = await getArticleInfo(ob)
    if (info[1] !== '') {
        ob.summary = info[2].toString()
        ob.abstracts = info[1]
        ob.summary_translation = info[3]
        ob.title = info[0]
    }
    
    let db_entry = await pushArticleEntry(ob)
    return db_entry
}

async function createTelegraphPage(ctx: Context, ob: Article) {
    if (ob.abstracts !== '') {
        const ph = new telegraph()
        const random_token = process.env.TELEGRAPH_TOKEN

        let content = 'Сгенерированная сводка:\n\n' + ob.summary_translation + '\n\nAbstract:\n\n' + ob.abstracts
        let page = await ph.createPage(random_token, ob.title, [{ tag: 'h1', children: [content] }], {
            return_content: true
        })
        ob.telegraph_link = page.url
    }
    else {
        console.log('empty page')
    }
    let db_obj = await pushArticleEntry(ob)
    return db_obj
}

async function sendResponse(ctx, ob: Article) {
    if (ob.abstracts !== '') {
        ctx.reply(ob.telegraph_link, Extra.inReplyTo(ctx.message.message_id));
    }
}

function create_pubmed_response(ctx, url, base_url) {
    ndl('get',url, {follow_max:5})
        .then(function (html) {
            const site_body = chr.load(html.body)
            const key = findPubmedID(site_body, base_url)
            const api_key = key.toString()
            // deleteArticle(null)
            articleEntry(api_key).then((db_article) => {
                if (db_article.telegraph_link == '' ||
                    db_article.summary == 'System error') {
                    console.log('getting info')
                    
                    let source= isPubmedLink(base_url) ? 'pubmed':'nature'
                    updateDBEntry(db_article, api_key, source).then((new_db_entry) => {
                        createTelegraphPage(ctx, new_db_entry).then((panew_db_entryge) => {
                            sendResponse(ctx, panew_db_entryge)
                        })
                    })
                }
                else {
                    // deleteArticle(db_article)
                    console.log('pre-computed')
                    countEntries().then((result) => console.log(result))
                    sendResponse(ctx, db_article)
                }
            })
        }).catch(function (err) {
            console.log("Error accessing first site " + err)
        })
}

function isPubmedLink(base_url) {
    return (base_url == ncbi_url || base_url == pubmed_url)
}

function isNatureLink(base_url) {
    return (base_url == nature_url)
}

export function setupExtractor(bot: Telegraf<Context>) {
    bot.on('message', ctx => {
        if (ctx.message.text !== undefined) {
            var detected_urls = ctx.message.text.match(/\bhttps?:\/\/\S+/gi)
            if (detected_urls !== null) {
                detected_urls = [...new Set(detected_urls)];
                detected_urls.forEach(url => {
                    const base_url = url.match('^https?:\/\/[^#?\/]+')[0]
                    if (isPubmedLink(base_url) || isNatureLink(base_url)) {
                        create_pubmed_response(ctx, url, base_url)
                    }
                });
            }
        }
    })
}
