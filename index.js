const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// const verifyJWT = (req, res, next) => {
//   const authorization = req.headers.authorization;
//   if (!authorization) {
//     return res.status(401).send({ error: true, message: 'unauthorized access' });
//   }
//   // bearer token
//   const token = authorization.split(' ')[1];

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ error: true, message: 'unauthorized access' })
//     }
//     req.decoded = decoded;
//     next();
//   })
// }



// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.swu9d.mongodb.net/?retryWrites=true&w=majority`;

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h290xzo.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });


const uri = 'mongodb://0.0.0.0:27017/'
const client = new MongoClient(uri);



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("TalkWorld").collection("users");
    const classCollection = client.db("TalkWorld").collection("class");
    const selectedClassCollection = client.db("TalkWorld").collection("selectedClass");

    //create jwt token
    app.post('/jwt-token', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      res.send({ token })
    })


    // creating a new user
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user.saveUser);
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // see all users on admin page
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })


    // isInstructor role
    app.get('/users/instructor/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' };
      res.send(result);
    })

    // isAdmin role
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    })


    // make admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    // make instructor
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "instructor"
        },
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    // save a class in database
    app.post('/add-a-class', async (req, res) => {
      const addClass = req.body;

      const { className, classImage, instructorName, instructorEmail, availableSeats, price } = addClass;
      const newClass = {
        className,
        classImage,
        instructorName,
        instructorEmail,
        availableSeats: parseInt(availableSeats),
        price: parseFloat(price),
        status: 'pending'
      };
      const result = await classCollection.insertOne(newClass);
      res.send(result)
    })

    // data display on instructorDashbord
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { instructorEmail: email };
      const result = await classCollection.find(query).toArray();
      res.send(result)
    })

    // display all classes on home page
    app.get('/classes', async (req, res) => {
      const classes = await classCollection.find().toArray();
      res.send(classes);
    })

    // display 6 populer classes on the home page
    app.get('/populerClasses', async (req, res) => {
      const result = await classCollection.find().limit(6).toArray();
      res.send(result)
    })

    // display 6 instructor on instructor page
    app.get('/instructor', async (req, res) => {
      const query = { role: 'instructor' };
      const instructor = await usersCollection.find(query).toArray();
      res.send(instructor)
    })

    // display all classes of a instructor
    app.get('/instructor/:email', async (req, res) => {
      const email = req.params.email;
      const sameEmail = { instructorEmail: email }
      const instructorEmail = await classCollection.find(sameEmail).toArray();
      res.send(instructorEmail)
    })

    // selectedClass stored in db
    app.post('/selectedClasses', async (req, res) => {
      const selectedClass = req.body;
      const result = await selectedClassCollection.insertOne(selectedClass);
      res.send(result)
    })

    // display selectedClasses to mySelectedClasses on student dashbord
    app.get('/selectedClasses', async (req, res) => {
      const result = await selectedClassCollection.find().toArray();
      res.send(result);
    })

    
    // delete selectedClass from mySelectedClasses
    // TODO: delete hocche na ...... 
    app.delete('/selectedClasses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query)
      if (result.deletedCount === 0) {
        console.log("Successfully deleted one document.");
        return res.send(result)
      } else {
        console.log("No documents matched the query. Deleted 0 documents.");
      }
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('TalkWorld server is running')
})

app.listen(port, () => {
  console.log(`TalkWorld server is running on port ${port}`);
})