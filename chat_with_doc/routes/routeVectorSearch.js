
import { MongoDBAtlasVectorSearch } from "langchain/vectorstores/mongodb_atlas";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import express from 'express';
import "dotenv/config";
const router = express.Router();
router.post('/vectorSearch', async (req, res) => {
    const client = new MongoClient(process.env.mongo_uri || "");

    const dbName = "docs";
    const collectionName = "embeddings";
    const collection = client.db(dbName).collection(collectionName);

    const question = await req.body.text;
    
    const vectorStore = new MongoDBAtlasVectorSearch( new GoogleGenerativeAIEmbeddings({
        modelName: "embedding-001"}),
        { collection,
        indexName: "default",
        textKey: "text", 
        embeddingKey: "embedding",}); 
        console.log("embedding");
        const retriever = vectorStore.asRetriever({
            searchType: "mmr",
            searchKwargs: {
              fetchK: 20,
              lambda: 0.1,
            },
          });

        const retrieverOutput = await retriever.getRelevantDocuments(question);
        console.log("--------");
        console.log(retrieverOutput);
             return Response.json(retrieverOutput);
     
})
export default router