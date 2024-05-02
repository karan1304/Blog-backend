const express = require('express');
const cors = require('cors');
const mongoose =require('mongoose');
const app = express();
const User = require('./models/User');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const Post = require('./models/Post');

const salt = bcrypt.genSaltSync(10);
const cookieParser = require('cookie-parser');
const secret = 'abcd12efgh34ijgklmn56op78qrs9tuvwx0yz'
const uploadMiddleware = multer({ dest: 'uploads/' })
const PORT = 8000;

mongoose.connect('mongodb+srv://ksharma1342000:raKTm4WLujOKNdmb@cluster0.hk3vxcu.mongodb.net/')
app.use(cors({credentials:true , origin:'http://localhost:5173'}));
app.use((req,res,next)=>{
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Methods","GET , POST , PUT , PATCH , DELETE");
    res.header("Access-Control-Allow-Headers","Origin , X-Requested-With , Content-Type , Accept , Authorization");
    next();
})
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname + '/uploads'));




app.post('/register',async (req,res)=>
{
    const {username, email, password} = req.body;
    try{
    const userDoc = await User.create({
        username,
        password:bcrypt.hashSync(password,salt),
            email
    });
    res.json(userDoc);
    }catch(e)
    {
        res.status(400).json(e);
    }
});

app.post('/login',async(req,res)=>
{
    const {username , password} = req.body;
    const userDoc = await User.find({username});
    const passOk = bcrypt.compareSync(password , userDoc[0].password);  
    if(passOk)
    {
        // login
        jwt.sign({username , id:userDoc[0].id} , secret , {} , (err,token)=>
        {
            if(err)
            {
                throw err;
            }
            res.cookie('token',token).json({id:userDoc[0].id, username});
        });
        
    } 
    else
    {
        
        res.status(400).json('Wrong Credentials'); 
    } 
})


app.get('/profile',(req,res)=>
{
    const {token} = req.cookies;
    jwt.verify(token , secret , {} , (err , info)=>
    {
        if(err)
        throw err;
        res.json(info);        
    })
})


app.post('/logout',(req,res)=>
{
    res.cookie('token','').json('ok');
})


app.post('/post',uploadMiddleware.single('file'), async(req,res)=>{
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length-1];
    const newPath= path+'.'+ext;
    fs.renameSync(path,newPath);

    const {token} = req.cookies;
    jwt.verify(token , secret , {} , async(err , info)=>
    {
        if(err)
        throw err;
        const {title,summary,content} = req.body;
        const postDoc = await Post.create({
         title,
         summary,
         content,
         cover:newPath,
         author:info.id
      }) 
      res.json(postDoc);        
    })   
})

app.put('/post',uploadMiddleware.single('file'),async(req,res)=>
{
    let newPath = null;
    if(req.file)
    {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length-1];
    newPath= path+'.'+ext;
    fs.renameSync(path,newPath);
    }
    const {token} = req.cookies;
    jwt.verify(token , secret , {} , async(err , info)=>
    {
        if(err)
        throw err;
        const {id,title,summary,content} = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if(!isAuthor)
        {
            return res.status(400).json('you are not the author');
        }

        await postDoc.updateOne({title,
            summary,
            content,
            cover:newPath ? newPath : postDoc.cover,
        });
        res.json(postDoc);
      }) 
    
})

app.get('/post',async(req,res)=>
{
    const posts = await Post.find()
    .populate('author',['username'])
    .sort({createdAt : -1})
    .limit(20)
    // const posts = await Post.find();
    res.json(posts)
})

app.get('/post/:id',async(req,res)=>
{
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author',['username']);
    res.json(postDoc)
})




app.listen(PORT,()=>console.log(`Server is running on PORT ${PORT}`));
