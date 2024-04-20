import { promises as fsp } from "fs";

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MongoDBAtlasVectorSearch } from "langchain/vectorstores/mongodb_atlas";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";


import { MongoClient } from "mongodb";
import "dotenv/config";

const client = new MongoClient(process.env.mongo_uri || "");
const dbName = "docs";
const collectionName = "embeddings";
const collection = client.db(dbName).collection(collectionName);

const docs_dir = "files";
const fileNames = await fsp.readdir(docs_dir);
const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "embedding-001",  });
for (const fileName of fileNames) {
    const document = await fsp.readFile(`${docs_dir}/${fileName}`, "utf8");
   
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 500,
      chunkOverlap: 50,
    });
    console.log(`Vectorizing ${splitter}`);
    const output = await splitter.createDocuments([document]);
    await MongoDBAtlasVectorSearch.fromDocuments(
        output,
        embeddings,
        {
          collection,
          indexName: "default",
          textKey: "text",
          embeddingKey: "embedding",
        }
      );
    
}
console.log("Done: Closing Connection");
await client.close();
// Make sentences of the script
// Senteces to promt to images
// Make Voice note of the script
// Sync voice note and words 
// Sync with image

