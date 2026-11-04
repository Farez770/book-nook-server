import express from "express";
import { MongoClient, ObjectId } from "mongodb";
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
  const result = await booksCollection.find().toArray();
  res.send(result);
});
//.sort({ addedDate: -1 })
// http://localhost:8000/books

app.get("/books/:id", async (req, res) => {
  const { id } = req.params;
  // console.log(id);
  const result = await booksCollection.findOne({
    _id: new ObjectId(id),
  });
  res.send(result);
});
// http://localhost:8000/books/id

//---new arraival books api
app.get("/new-arrivals", async (req, res) => {
  const result = await booksCollection.find().sort({ addedDate: -1 }).toArray();
  res.send(result);
});

app.get("/my-booking/:email", async (req, res) => {
  const { email } = req.params;
  const result = await booksCollection.find({ userEmail: email }).toArray();
  console.log(result);
  res.send(result);
});
// http://localhost:8000/books/email

//below api update the book data api

app.patch("/books/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await booksCollection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: updatedData,
    },
  );
  res.json(result);
  console.log(updatedData);
});

//Below api is for Delete the Book

app.delete("/books/:id", async (req, res) => {
  const id = req.params;
  const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

//--------------------------------------
//borrows collectiopn api
// app.get("/borrows", async (req, res) => {
//   const result = await borrowsCollection.find().toArray();
//   console.log(result);
//   res.send(result);
// });

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});

export default app;
