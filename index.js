import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

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

app.post("/add-book", async (req, res) => {
  const data = req.body;
  // console.log(data);
  const bookData = {
    ...data,
    addedDate: new Date(),
  };
  const result = await booksCollection.insertOne(bookData);
  console.log(result);
  res.send(result);
});
// http://localhost:8000/add-book

app.get("/books", async (req, res) => {
  const result = await booksCollection.find().sort({ addedDate: -1 }).toArray();
  res.send(result);
});
//.sort({ addedDate: -1 })
// http://localhost:8000/books

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});

export default app;
