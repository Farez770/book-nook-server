import express from "express";
import { MongoClient } from "mongodb";
import "dotenv/config";

const app = express();
const port = 8000 || process.env.PORT;

const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoCLient = await connectToMongoDB();
const db = mongoCLient.db("booknook");
const booksCollection = db.collection("books");
const borrowsCollection = db.collection("borrows");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//localhost:3000/
//localhost:3000/add-book

app.post("/add-book", async (req, res) => {
  const data = req.body;
  console.log(data);
  const result = await booksCollection.insertOne(data);
  console.log(result);
  res.send(result);
});

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});

export default app();
