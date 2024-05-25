// covert audio to text ✔
// Covert to vector embeddings
// Save emeddings
// Summerise the text ✔
// Create front end 

import {
    GoogleGenerativeAI
} from "@google/generative-ai";
import express from "express";
import fs from 'fs';
import { YoutubeTranscript } from 'youtube-transcript';

import { AssemblyAI } from 'assemblyai'


const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: "Summarize the text and explain it in a way that any layman can understand it",
});

const client = new AssemblyAI({
    apiKey:  process.env.ASSEMBLY_API_KEY
  })



const router = express.Router();



router.post("/textToSpeech", async (req, res) => {
const url = req.body.url
const transcriptionData =  await YoutubeTranscript.fetchTranscript(url)
const transcriptedText = convertDataToTextFormat(transcriptionData)
const summary =   await genarateSummery(transcriptedText)
res.status(200).send({
    success:"true",
    "data":{summary}
});
});

router.get("/summeriseText", async (req, res) => {
       const text = fs.readFileSync('routes/transcription.text','utf8');
       const prompt = ` Analyze the text thoroughly, ensuring all key points are covered.
                       Utilize interactive styles like bullets, lists, and text formatting for emphasis.
                       Then, craft a summary that a 12-year-old can easily understand, while ensuring all 
                       essential information is captured. Conclude with a succinct wrap-up.
                       Here is the text  "${text}"
                         
        `
      
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();
        console.log(summary);
     
       res.send(summary);
});
router.post("/audioToText", async (req, res) => {
  const audioUrl ='routes/song.mp3'
    const config = {
    audio_url: audioUrl
    }
const transcript = await client.transcripts.create(config)
// deleteing the timestamps 
delete transcript.words 

res.status(200).send({
    success:"true",
    "data":{transcript}
});
})


async function genarateSummery(text){
    const prompt = ` Analyze the text thoroughly, ensuring all key points are covered.
                       Utilize interactive styles like bullets, lists, and text formatting for emphasis.
                       Then, craft a summary that a 12-year-old can easily understand, while ensuring all 
                       essential information is captured. Conclude with a succinct wrap-up.
                       Here is the text  "${text}"
                         
        `
      
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
}
function convertDataToTextFormat(data) {
   let transcription = ""
    if(data.length==0){
        return
    }
    data.forEach(transcript => {
        transcription = transcription + " " +transcript.text
    });
    return transcription

}
export default router;