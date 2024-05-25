import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  PromptTemplate
} from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import "dotenv/config";
import express from "express";
import fs from 'fs';
import { MongoDBAtlasVectorSearch } from "langchain/vectorstores/mongodb_atlas";
import { MongoClient } from "mongodb";

import { ConversationChain } from "langchain/chains";
import { BufferMemory, ChatMessageHistory, BufferWindowMemory} from "langchain/memory";
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
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-pro",
    maxOutputTokens: 2048,
    streaming: true,
 });

 
  const messages = [
    [
      "system",
      "You are a helpful assistant. Answer all questions to the best of your ability.",
    ],
    HumanMessagePromptTemplate.fromTemplate(currentMessageContent), 
  ];
  const prompt = ChatPromptTemplate.fromMessages(messages);
  
 

  // const chain = RunnableSequence.from([
  //   {
  //     context: result,
  //     question: new RunnablePassthrough(),
  //   },
  //   prompt,
  //   model,
  //   new StringOutputParser(),
  // ]);
  
let conversations = []

const db = fs.readFileSync('routes/data.json');
let jsonData = JSON.parse(db);


for (const [key, value] of Object.entries(jsonData)) {
  if(key=='Human'){
    conversations.push(new HumanMessage(value))
  }else{
   conversations.push(new AIMessage(value))
  }
}

// const answer = await chain.invoke( conversations );
// jsonData.push(
//   {
//     "Human":currentMessageContent,
//     "AI":answer
  
// });


const memory = new BufferMemory();
const chains = new ConversationChain({ llm: model, memory: memory });

const res2 = await chains.invoke({ input: currentMessageContent });
console.log({ res2 });

fs.writeFileSync('routes/data.json', JSON.stringify(jsonData), (err) => {
  if (err) throw err;
  console.log('Data added to file');
});
res.status(200).send({
  answer:res2
})
 
});

router.post("/chat-bot", async (req, res) => {
  const currentMessageContent = req.body.messages;
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-pro",
    maxOutputTokens: 2048,
    streaming: true,
 });
const pastMessages = [
    new HumanMessage(" Hi! I'm Jim."),
    new AIMessage("Nice to meet you, Jim!"),
    new HumanMessage("my age is 30."),
    new AIMessage("Glad to know"),
   
  ];


  
  // const memory = new BufferMemory({
  //   chatHistory: new ChatMessageHistory(pastMessages),
  // });

  // remeber user interaction upto 5 times
  const memory = new BufferWindowMemory({ k: 5 ,chatHistory: new ChatMessageHistory(pastMessages),});

  const chain = new ConversationChain({ llm: model, memory: memory,verbose:true, });
  const res1 = await chain.call({ input:currentMessageContent});

 
  res.status(200).send({
    answer:res1
  })

})

router.post("/chat-doc", async (req, res) => {

  // fetch vectors from mongoDB
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

const TEMPLATE = `You are a very enthusiastic history subject representative who loves to help people! if answer is not explicitly written in the documentation, say "False"`;
const messages = [
  SystemMessagePromptTemplate.fromTemplate(TEMPLATE),
  HumanMessagePromptTemplate.fromTemplate(currentMessageContent),
];
const prompt = ChatPromptTemplate.fromMessages(messages);


//const prompt1 = ChatPromptTemplate.fromMessages(messages1);
/*
  Todo: Need to check how this  PromptTemplate.fromTemplate works for now 
  commenting.
*/
// const promptfromP =  PromptTemplate.fromTemplate(
//   TEMPLATE
// );

const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-pro",
  maxOutputTokens: 2048,
  streaming: true,

});

  const pastMessages = fetchConversation()

  const promptTemplate = new PromptTemplate({
    template: `
    You are an AI assistant. Your task is to check the history for specific data.
    If the data is present, respond accordingly. if data is not present then say 'no inforamtion found' .
    
    ${pastMessages}
    
    Question: ${currentMessageContent}
    `,
    inputVariables: ['history', 'question'],
  });
  const memory = new BufferWindowMemory({ k: 5 ,chatHistory: new ChatMessageHistory(pastMessages),});
  const chain = new ConversationChain({ llm: model, memory: memory,promptTemplate:promptTemplate});
  const res1 = await chain.call({ input:currentMessageContent});
  

const Conversation = {
  "Human":currentMessageContent,
  "AI":res1['response']
}
saveConversation(Conversation)

if(res1['response'])

res.status(200).send({
  answer:res1 ['response']
})
})

function fetchConversation(){
  let conversations=[]
  const db = fs.readFileSync('routes/data.json');
  if(db.byteLength==0){
    return;
  }
  let conversationHistory = JSON.parse(db);
      conversationHistory.forEach((key,value) => {
        conversations.push(new HumanMessage(key['Human']))
        conversations.push(new AIMessage(key['AI']))
       });
    // for (const [key, value] of Object.entries(conversationHistory)) {
     
    //   if(key=='Human'){
       
    //     conversations.push(new HumanMessage(value))
    //   }else{
    //    conversations.push(new AIMessage(value))
    //   }
    // }
    
  return conversations;
}

function saveConversation(conversation){
  let conversationHistory =[]
  const db = fs.readFileSync('routes/data.json');
  
  if(db.byteLength==0){
    conversationHistory.push(conversation)
    fs.writeFileSync('routes/data.json', JSON.stringify(conversationHistory), (err) => {
      if (err) throw err;
      console.log('Data added to file');
    });
    return;
  }
  
  conversationHistory = JSON.parse(db);
 
  if(conversationHistory.length>4){
    // remove the 1st conversation from data
    conversationHistory.splice(0,1)
  }
  conversationHistory.push(conversation)

  fs.writeFileSync('routes/data.json', JSON.stringify(conversationHistory), (err) => {
    if (err) throw err;
    console.log('Data added to file');
  });
  
  return conversationHistory
}

export default router;
