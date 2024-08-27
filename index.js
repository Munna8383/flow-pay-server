const express = require("express")
const cors = require("cors")
const app= express()
require("dotenv").config()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())







const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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


    // jwt related api

    app.post("/jwt",async(req,res)=>{
      
      const user = req.body

      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:"1h"})

      res.send({token})
    })

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

        bcrypt.compare(data.pin,user.pin,async function (err, response) {
            if (err) {
                res.send({ message: "error" });
            } else if (response) {

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
                    role: data.role,
                    type:"send money"
                }



                const insertedResult = await transactionCollection.insertOne(transaction)

                res.send(insertedResult)
            }

            
        }
               
            } else {
                res.send({ message: "pin mismatch" });
            }
        }) 

    })


    // get all transaction list for admin

    app.get("/transactionList",async(req,res)=>{

        const result = await transactionCollection.find().toArray()

        res.send(result)
    })


    // get transaction list of user

    app.get("/transaction/:email",async(req,res)=>{

        const email = req.params.email

        const query = {sender:email}

        const result = await transactionCollection.find(query).toArray()

        res.send(result)

    })



    // get all transaction for agent 

    app.get("/transactionAgent",async(req,res)=>{

        const mobile = req.query.mobile

        const query = {receiver:mobile}

        const result = await transactionCollection.find(query).toArray()

        res.send(result)

    })



    




    // Cash In By User

    app.post("/cashIn",async(req,res)=>{

        const data = req.body

        const query = {email:data.email}

        const user = await userCollection.findOne(query)


        bcrypt.compare(data.pin,user.pin,async function (err, response) {
            if (err) {
                res.send({ message: "error" });
            } else if (response) {

                const transaction = {
                    sender: data.email,
                    senderMobile : data.mobile,
                    receiver: data.agentNumber,
                    amount: parseInt(data.amount),
                    date: data.date,
                    status:"pending",
                    role: data.role,
                    type:"CashIn"
                }


                const result= await transactionCollection.insertOne(transaction)

                res.send(result)
               
            } else {
                res.send({ message: "pin mismatch" });
            }
        }) 


    })

    // cash out by user

    app.post("/cashOut",async(req,res)=>{

        const data = req.body

        const query = {email:data.email}

        const user = await userCollection.findOne(query)


        bcrypt.compare(data.pin,user.pin,async function (err, response) {
            if (err) {
                res.send({ message: "error" });
            } else if (response) {

                const transaction = {
                    sender: data.email,
                    senderMobile : data.mobile,
                    receiver: data.agentNumber,
                    amount: parseInt(data.amount),
                    date: data.date,
                    status:"pending",
                    role: data.role,
                    type:"CashOut"
                }


                const result= await transactionCollection.insertOne(transaction)

                res.send(result)
               
            } else {
                res.send({ message: "pin mismatch" });
            }
        }) 


    })






    // money request that can seen by agent

    app.get("/moneyRequestAgent",async(req,res)=>{
        
        mobile = req.query.mobile

        const query = {
            $and: [
              { receiver: mobile },
              { status: "pending" }
            ]
          }

          const result = await transactionCollection.find(query).toArray()

          res.send(result)
    })


    // accept cash In or Cash out request by the agent

    app.put("/acceptRequest",async(req,res)=>{
        const type = req.query.type
        const amount = parseInt(req.query.amount)
        const receiver = req.query.receiver
        const senderMobile = req.query.senderMobile
        const id = req.query.id





        if(type==="CashOut"){

            
            const query1 = {mobile:senderMobile}
            const query2 = {mobile:receiver}
            const query3 = {_id:new ObjectId(id)}


            const user1 = await userCollection.findOne(query1)
            const user2 = await userCollection.findOne(query2)


            const charge =  (1.5 / 100) * amount;



            updateDoc1 ={
                $set:{
                    balance: parseInt((user1.balance-amount)-parseInt(charge))
                }
            }
            updateDoc2 ={
                $set:{
                    balance: parseInt(user2.balance+amount+charge)
                }
            }

            updateDoc3 = {
                $set:{
                    status:"completed"
                }
            }




            const result1 = await userCollection.updateOne(query1,updateDoc1)
            const result2 = await userCollection.updateOne(query2,updateDoc2)
            const result3 = await transactionCollection.updateOne(query3,updateDoc3)

            if(result1,result2,result3){

                res.send({message:"success"})
            }




            
            
        }
        




        if(type==="CashIn"){

            const query1 = {mobile:senderMobile}
            const query2 = {mobile:receiver}
            const query3 = {_id:new ObjectId(id)}


            const user1 = await userCollection.findOne(query1)
            const user2 = await userCollection.findOne(query2)



            updateDoc1 ={
                $set:{
                    balance: parseInt(user1.balance+amount)
                }
            }
            updateDoc2 ={
                $set:{
                    balance: parseInt(user2.balance-amount)
                }
            }

            updateDoc3 = {
                $set:{
                    status:"completed"
                }
            }

            const result1 = await userCollection.updateOne(query1,updateDoc1)
            const result2 = await userCollection.updateOne(query2,updateDoc2)
            const result3 = await transactionCollection.updateOne(query3,updateDoc3)

            if(result1,result2,result3){

                res.send({message:"success"})
            }



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