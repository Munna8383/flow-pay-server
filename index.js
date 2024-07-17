const express = require("express")
const cors = require("cors")
const app= express()
const bcrypt = require("bcryptjs")
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://flowPay12:Munna8399@cluster0.akl91ab.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {


    const userCollection = client.db("flow-payDB").collection("user")
    const transactionCollection = client.db("flow-payDB").collection("transaction")

//  add user in the database

    app.post("/addUser",async(req,res)=>{

        
        const salt = await bcrypt.genSalt(10)

        const secPin = await bcrypt.hash( req.body.pin,salt)

        const data1 = {
            name: req.body.name,
            email:req.body.email,
            pin: secPin,
            requestFor:req.body.category,
            role:"noRule",
            mobile:req.body.mobile
        }


        const user = await userCollection.findOne({email:req.body.email})


        if(!user){

            const result = await userCollection.insertOne(data1)

            res.send(result)


        }else{

            res.send({message:"user exist"})
        }

      

    })

    // implement login


    app.post("/loginUser", async (req, res) => {
        const data = req.body;
        const any = data.emailOrPhone;
    
        // Find user by email or mobile
        const findingUser = await userCollection.findOne({ email: any });
        const findingUser2 = await userCollection.findOne({ mobile: any });
    
        const storedData = findingUser || findingUser2;
    
        console.log(storedData);
    
        if (storedData) {
            const pin = data.pin; // Extract pin from request body
    
            // Compare provided pin with stored pin
            bcrypt.compare(pin, storedData.pin, function (err, response) {
                if (err) {
                    res.send({ message: "error" });
                } else if (response) {
                    res.send({ message: "matched" });
                } else {
                    res.send({ message: "pin mismatch" });
                }
            });
        } else {
            console.log("user not found");
            res.send({ message: "user not found" }); // Send response if user is not found
        }
    });


    app.get("/user",async(req,res)=>{

        const email = req.query.email

        const findingUser = await userCollection.findOne({ email: email});
        const findingUser2 = await userCollection.findOne({ mobile: email });

        const result = findingUser || findingUser2

        res.send(result)



    })

    // get all user list

    app.get("/users",async(req,res)=>{

        const result = await userCollection.find().toArray()

        res.send(result)

    })



    // accept agent

    app.put("/acceptAgent",async(req,res)=>{

        const email=req.query.agent


        const query = {email:email}
        const option = {upsert:true}

        
        const updatedDoc={
            $set:{
                balance:parseInt(10000),
                role:"agent",
                requestFor:"accepted"
            }
        }


        const result = await userCollection.updateOne(query,updatedDoc,option)

        res.send(result)
    })
    // accept User

    app.put("/acceptUser",async(req,res)=>{

        const email=req.query.user


        const query = {email:email}
        const option = {upsert:true}

        
        const updatedDoc={
            $set:{
                balance:parseInt(40),
                role:"user",
                requestFor:"accepted"
            }
        }


        const result = await userCollection.updateOne(query,updatedDoc,option)

        res.send(result)
    })


    // send money

    app.post("/sendMoney",async(req,res)=>{

        const data = req.body

        const query = {email:data.email}

        const user = await userCollection.findOne(query)

        if(parseInt(data.amount)<parseInt(user.balance)){

            const updatedDoc = {
                $set:{
                    balance:parseInt(user.balance)-parseInt(data.amount)
                }
            }


            const result = await userCollection.updateOne(query,updatedDoc)


            if(result){

                const transaction = {
                    sender: data.email,
                    senderMobile : data.mobile,
                    receiver: data.receiver,
                    amount: data.amount,
                    date: data.date,
                    status:"complete",
                    role: data.role
                }



                const insertedResult = await transactionCollection.insertOne(transaction)

                res.send(insertedResult)
            }




            
        }else{
            res.send({message:"transaction Failed"})
        }

    })














    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get("/",async(req,res)=>{

    res.send("flow pay is running")
})


app.listen(port,()=>{
    console.log("server running")
})