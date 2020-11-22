const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = mongoose.model("User")
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const JWT_SECRET = 'sasaaas'
const requireLogin = require('../middleware/requireLogin')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const {SENDGRID_API,EMAIL} = require('../config/keys')
//


const transporter = nodemailer.createTransport(sendgridTransport({
    auth:{
        api_key:SENDGRID_API
    }
}))

router.post('/signup',(req,res)=>{
  const {name,rno,password,pic} = req.body 
  if(!rno || !password || !name){
     return res.status(422).json({error:"please add all the fields"})
  }
  User.findOne({rno:rno})
  .then((savedUser)=>{
      if(savedUser){
        return res.status(422).json({error:"user already exists with that Roll No"})
      }
      //bcrypt.hash(password,0)
      //.then(hashedpassword=>{
            const user = new User({
                rno,
                password,
                name,
                pic
            })
    
            user.save()
            .then(user=>{
                // transporter.sendMail({
                //     to:user.email,
                //     from:"no-reply@insta.com",
                //     subject:"signup success",
                //     html:"<h1>welcome to instagram</h1>"
                // })
                res.json({message:"saved successfully"})
            })
            .catch(err=>{
                console.log(err)
            })
     
  })
  .catch(err=>{
    console.log(err)
  })
})


router.post('/signin',(req,res)=>{
    const {rno,password} = req.body
    if(!rno || !password){
       return res.status(422).json({error:"please add Roll No or password"})
    }
    User.findOne({rno:rno})
    .then(savedUser=>{
        if(!savedUser){
           return res.status(422).json({error:"Invalid Roll No or password"})
        }
        if(password===savedUser.password)
        {
            const token = jwt.sign({_id:savedUser._id},JWT_SECRET)
            const {_id,name,rno,followers,following,pic} = savedUser
            res.json({token,user:{_id,name,rno,followers,following,pic}})
        }
        else{
            return res.status(422).json({error:"Invalid rno or password"})
        }
    })
})


router.post('/reset-password',(req,res)=>{
     crypto.randomBytes(32,(err,buffer)=>{
         if(err){
             console.log(err)
         }
         const token = buffer.toString("hex")
         User.findOne({rno:req.body.rno})
         .then(user=>{
             if(!user){
                 return res.status(422).json({error:"User dont exists with that Roll No"})
             }
             user.resetToken = token
             user.expireToken = Date.now() + 3600000
             user.save().then((result)=>{
                 transporter.sendMail({
                     to:user.rno,
                     from:"no-replay@insta.com",
                     subject:"password reset",
                     html:`
                     <p>You requested for password reset</p>
                     <h5>click in this <a href="${EMAIL}/reset/${token}">link</a> to reset password</h5>
                     `
                 })
                 res.json({message:"check your email"})
             })

         })
     })
})


router.post('/new-password',(req,res)=>{
    const newPassword = req.body.password
    const sentToken = req.body.token
    User.findOne({resetToken:sentToken,expireToken:{$gt:Date.now()}})
    .then(user=>{
        if(!user){
            return res.status(422).json({error:"Try again session expired"})
        }
        bcrypt.hash(newPassword,12).then(hashedpassword=>{
           user.password = hashedpassword
           user.resetToken = undefined
           user.expireToken = undefined
           user.save().then((saveduser)=>{
               res.json({message:"password updated success"})
           })
        })
    }).catch(err=>{
        console.log(err)
    })
})


module.exports = router