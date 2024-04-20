import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import "dotenv/config";
import express from "express";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RetrievalQAChain } from "langchain/chains";
import { MongoDBAtlasVectorSearch } from "langchain/vectorstores/mongodb_atlas";
import { MongoClient } from "mongodb";
import { AIMessage,HumanMessage  } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";

export const runtime = "edge";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("HII");
});

router.post("/", async (req, res) => {
    const client = new MongoClient(process.env.mongo_uri || "");
    const dbName = "docs";
    const collectionName = "embeddings";
    const collection = client.db(dbName).collection(collectionName);
    const currentMessageContent = req.body.messages;
 
  const vectorStore = new MongoDBAtlasVectorSearch(
    new GoogleGenerativeAIEmbeddings({
      modelName: "embedding-001",
    }),
    {
      collection,
      indexName: "default",
      textKey: "text",
      embeddingKey: "embedding",
    }
  );
  const retriever = vectorStore.asRetriever({
    searchType: "mmr",
    searchKwargs: {
      fetchK: 20,
      lambda: 0.1,
    },
  });

  const retrieverOutput = await retriever.getRelevantDocuments(currentMessageContent);
  var result = Response.json(retrieverOutput);

  const TEMPLATE = `You are a very enthusiastic history subject representative who loves to help people! if answer is not explicitly written in the documentation, say "Sorry, I don't know how to help with that."`;
  const messages = [
    SystemMessagePromptTemplate.fromTemplate(TEMPLATE),
    HumanMessagePromptTemplate.fromTemplate(currentMessageContent),
  ];
  console.log(messages);
  const prompt = ChatPromptTemplate.fromMessages(messages);
  
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-pro",
    maxOutputTokens: 2048,
    streaming: true,

  });

  const chain = RunnableSequence.from([
    {
      context: result,
      question: new RunnablePassthrough(),
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);
  
  
  // const chain = VectorDBQAChain.fromLLM(model, vectorStore);
  // const res1 = await chain.call({
  //   input_documents: TEMPLATE,
  //   query: "Date of birth of gandhiji",
  // });
 // console.log({ res1 });

//  const answer = await chain.invoke(
//   "Date of birth of gandhiji?"
// );

//  print(answer)
const c = [
  new HumanMessage("Date of birth of mahatma gandhi?"),
  new AIMessage("October 2, 1869"),
 
  ]
console.log("ANWER");  
const answer = await chain.invoke(c);

res.status(200).send({
  answer:answer
})
 
});

export default router;
