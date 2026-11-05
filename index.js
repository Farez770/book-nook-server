import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

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

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(authHeader);

  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  console.log(token);

  if (!token) {
    return res.status(401).send({ msg: "Unauthorized" });
  }
  // console.log(token);

  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
  );

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
    console.log("jwt payload", payload);
  } catch (error) {
    return res.status(500).send({ msg: "Server Error!" });
  }
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});
//localhost:3000/

app.post("/add-book", verifyToken, async (req, res) => {
  const data = req.body;
  // console.log(data);

  // form data always arrives as a string, so convert totalCopies to a real number
  const bookData = {
    ...data,
    totalCopies: parseInt(data.totalCopies, 10) || 0,
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

app.get("/books/:id", verifyToken, async (req, res) => {
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

app.get("/my-booking/:email", verifyToken, async (req, res) => {
  const { email } = req.params;
  const result = await booksCollection.find({ userEmail: email }).toArray();
  console.log(result);
  res.send(result);
});
// http://localhost:8000/books/email

//below api update the book data api

app.patch("/books/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  // form data arrives as a string, keep totalCopies numeric
  if (updatedData.totalCopies !== undefined) {
    updatedData.totalCopies = parseInt(updatedData.totalCopies, 10) || 0;
  }

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

app.delete("/books/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

//Return Book api - removes the borrow record and increases totalCopies back
app.delete("/borrows/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid borrow ID!" });
    }

    const borrow = await borrowsCollection.findOne({
      _id: new ObjectId(id),
      userEmail: req.user.email,
    });

    if (!borrow) {
      return res
        .status(404)
        .send({ message: "Borrow record not found for this user!" });
    }

    const result = await borrowsCollection.deleteOne({ _id: borrow._id });

    if (result.deletedCount === 0) {
      return res.status(500).send({ message: "Failed to return the book!" });
    }

    // give the copy back to the book
    await booksCollection.updateOne(
      { _id: borrow.bookId },
      { $inc: { totalCopies: 1 } },
    );

    return res.send({ message: "Book returned successfully!" });
  } catch (error) {
    console.error("Return Book Route Error:", error);
    return res.status(500).send({
      message: "Something went wrong while returning the book!",
    });
  }
});

//--------------------------------------
//borrows collectiopn api
app.get("/borrows", verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    if (!userEmail) {
      return res
        .status(401)
        .send({ message: "User email not found in token!" });
    }

    // only return the borrows of the logged in user, newest first
    const result = await borrowsCollection
      .find({ userEmail })
      .sort({ borrowDate: -1 })
      .toArray();
    res.send(result);
  } catch (error) {
    console.error("Borrows Route Error:", error);
    res.status(500).send({
      message: "Something went wrong while loading your borrowed books!",
    });
  }
});

app.post("/borrows", verifyToken, async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!bookId || !ObjectId.isValid(bookId)) {
      return res.status(400).send({ message: "Invalid book ID!" });
    }

    const userEmail = req.user.email;

    if (!userEmail) {
      console.log("STOPPED: User email missing");
      return res
        .status(401)
        .send({ message: "User email not found in token!" });
    }

    const book = await booksCollection.findOne({
      _id: new ObjectId(bookId),
    });

    if (!book) {
      console.log("STOPPED: Book not found");
      return res.status(404).send({ message: "Book not found!" });
    }

    const alreadyBorrowed = await borrowsCollection.findOne({
      bookId: book._id,
      userEmail,
    });

    if (alreadyBorrowed) {
      console.log("STOPPED: Already borrowed");
      return res
        .status(400)
        .send({ message: "You have already borrowed this book!" });
    }

    // self-heal: normalize totalCopies to a number if an older record stored it as a string
    // (string values never match the { $gt: 0 } filter, which blocked every borrow)
    if (typeof book.totalCopies !== "number") {
      book.totalCopies = parseInt(book.totalCopies, 10) || 0;
      await booksCollection.updateOne(
        { _id: book._id },
        { $set: { totalCopies: book.totalCopies } },
      );
    }

    const updateBook = await booksCollection.updateOne(
      { _id: book._id, totalCopies: { $gt: 0 } },
      { $inc: { totalCopies: -1 } },
    );

    if (updateBook.modifiedCount === 0) {
      console.log("STOPPED: No available copies");
      return res
        .status(400)
        .send({ message: "This book is currently unavailable!" });
    }

    const borrowDate = new Date();
    const returnDate = new Date(borrowDate);
    returnDate.setDate(returnDate.getDate() + 7);

    const borrowData = {
      bookId: book._id,
      bookTitle: book.title,
      bookImage: book.image,
      userEmail,
      borrowDate,
      returnDate,
    };

    const result = await borrowsCollection.insertOne(borrowData);

    return res.status(201).send({
      message: "Book borrowed successfully!",
      result,
    });
  } catch (error) {
    console.error("Borrow Route Error:", error);

    return res.status(500).send({
      message: "Something went wrong while borrowing the book!",
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});

export default app;
