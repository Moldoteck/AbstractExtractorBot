// Dependencies
import { prop, getModelForClass } from '@typegoose/typegoose'

export class Article {
  @prop({ default: '' })
  telegraph_link: string

  @prop({ default: '' })
  title: string

  @prop({ default: '' })
  summary: string

  @prop({ default: '' })
  summary_translation: string

  @prop({ default: '' })
  abstracts: string

  @prop({ default: '' })
  source: string
  
  @prop({ default: '' })
  api_key: string
}

// Get article model
const ArticleModel = getModelForClass(Article, {
  schemaOptions: { timestamps: false },
})

// Get existing article or create raw article
export async function findArticle(key: string) {
  let article = await ArticleModel.findOne({ api_key:key })
  if (!article) {
    try {
      article = await new ArticleModel({ api_key:key }).save()
    } catch (err) {
      article = await ArticleModel.findOne({ api_key:key })
    }
  }
  return article
}

// Create article or replace existent
export async function createArticle(ob: Article) {
  let filter = ob.api_key
  let article = await ArticleModel.findOneAndUpdate({ api_key:filter }, ob,{new:true})

  if (!article) {
    try {
      article = await new ArticleModel(ob).save()
    } catch (err) {
      article = await ArticleModel.findOne(ob)
    }
  }
  return article
}
import * as mongoose from 'mongoose'
// Delete article
export async function deleteArticle(ob: Article) {  
  // let filter = ob.api_key
  // await mongoose.connection.db.dropDatabase()
  await ArticleModel.remove({})
  
  let article = await ArticleModel.findByIdAndDelete(ob)
  return article
}

// Delete article
export async function countArticles() {  
  let number = await ArticleModel.countDocuments({})
  return number
}

