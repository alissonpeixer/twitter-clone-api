import Router from '@koa/router';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
//
export const router = new Router();
const prisma = new PrismaClient();
//




router.post('/signup', async ctx => {
  const saltRounds = 10
  const reqBody = ctx.request.body;
  const Find = prisma.User;


  const usernameAnaly = await Find.findUnique({ where: { username: reqBody.username } });
  const emailAnaly = await Find.findUnique({ where: { email: reqBody.email } });
  const phoneAnaly = await Find.findUnique({ where: { phone: reqBody.phone } });

  if (Boolean(usernameAnaly)) {
    ctx.status = 401;
    ctx.body = "Username já em uso!"
    return
  }
  if (Boolean(emailAnaly)) {
    ctx.status = 401;
    ctx.body = "E-mail já em uso!"
    return
  }
  if (Boolean(phoneAnaly)) {
    ctx.status = 401;
    ctx.body = "Numero de telefone já em uso!";
    return
  }


  const salt = bcrypt.genSaltSync(saltRounds);
  const Password = bcrypt.hashSync(reqBody.password, salt);

  const newUser = await Find.create({
    data: {
      name: reqBody.name,
      surname: reqBody.surname,
      username: reqBody.username,
      email: reqBody.email,
      password: Password,
      phone: reqBody.phone
    }
  });


  const acessToken =  jwt.sign({
    data: newUser.id
  }, process.env.JWT_SECRET, { expiresIn: '24h' });

  ctx.body = {
    id: newUser.id,
    name: newUser.name,
    surname: newUser.surname,
    username: newUser.username,
    email: newUser.email,
    acessToken
  };
})


router.get('/login', async ctx => {
  const [, token] = ctx.request.headers.authorization.split(' ');
  const [login, plainTextPassword] = Buffer.from(token, 'base64').toString().split(':');

  const user = await prisma.User.findUnique({ where: { username: login } }) || await prisma.User.findUnique({ where: { email: login } })

  if (!user) {
    ctx.status = 403;
    ctx.body = 'Invalid Login!'
    return
  }

  const Password = bcrypt.hashSync(plainTextPassword, user.password);


  if (Password) {


    const acessToken = jwt.sign({
      data: user.id
    }, process.env.JWT_SECRET, { expiresIn: '1h' });



    ctx.body = {
      id: user.id,
      name: user.name,
      acessToken

    }
    return
  }

  ctx.status = 403;
  ctx.body = 'Invalid Password';
  return


})


router.post('/post', async ctx =>{
  const [,userToken] = ctx.request.headers?.authorization?.split(' ') || []

  if(!userToken){
    ctx.status = 403;
    ctx.body = 'Token not found!'
    return
  }

  try {
    const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
    const userInfo = await prisma.User.findUnique({
      where:{
        id: decoded.data
      }
    })

    if(!userInfo){
      ctx.status= 401;
      ctx.body = 'Usuario não encontado!'
      return
    }

 
  


    const createLike = await prisma.PostLikes.create({
      data: {
        userId: userInfo.id
      }
    }) 

   

    const createPost = await prisma.Post.create({
      data: {
        userId: createLike.userId,
        text: ctx.request.body.text,
        likeID: createLike.likeId
      }
    }) 

    ctx.body = createPost

  } catch (e) {
    console.log(e)

    return

  }




})


router.get('/post', async ctx =>{
  const [, userToken] = ctx.request.headers?.authorization?.split(' ') || []

  if (!userToken) {
      ctx.status = 401
      return
  }


  try {
    jwt.verify(userToken, process.env.JWT_SECRET);

    const posts = await prisma.Post.findMany({

      include: {
          user: true,
          postlikes: true
      }
    })



    ctx.body = posts

  } catch (e) {
    console.log(e)
    ctx.status = 401
    ctx.body = "Token Invalido"

    return

    // if(e === 'invalid token'){
    //   ctx.status = 403;
    //   ctx.body = 'Token de acesso invalido!'
    // }

  }




})


router.post('/like', async ctx =>{



  const [, userToken] = ctx.request.headers?.authorization?.split(' ') || []

  if (!userToken) {
    ctx.status = 401
    return
  }
  
  try {
      
    jwt.verify(userToken, process.env.JWT_SECRET);


    const isLiked = await prisma.isLiked.create({
      data: {
        isLiked: ctx.request.body.userlikeId,
        likeID: ctx.request.body.likeId
      }
    }) 

    
    const getLikes = await prisma.PostLikes.findUnique({ 
      where: {likeId: ctx.request.body.likeId}
    })



    const like = await prisma.PostLikes.update({
      where: { likeId: ctx.request.body.likeId },
      data: { 
        likes: getLikes.likes + 1
       },
    })



    ctx.status = 200;
    ctx.body = like;

  } catch (e) {
    console.log(e)
  }
})


