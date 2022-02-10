import './App.css';
import {useState, useEffect} from 'react'
import { projectFirestore, timestamp } from './config/firebase'

function App() {

  const [username, setUsername] = useState('')
  const [post, setPost] = useState('')
  const [viewpost, setViewPost] = useState([])
  const [names, setNames] = useState([])

  useEffect(()=>{

    const unsubNames = projectFirestore.collection('users').where('user','!=','poojesh').onSnapshot(docs=>
      {
        let result = []
        docs.forEach(doc => (
          result.push({id:doc.id,...doc.data()})
        ))

        setNames(result)
      }
    )

    return ()=>{
      unsubNames()
    }
  },[])

  const handleFollow = async (e,user, addFollow) => {
    e.preventDefault()

    const mainuser = await projectFirestore.collection('users').doc(user).get().then(doc =>{
      return{
        id:doc.id,
        ...doc.data()
      }
     })

    const followUser = await projectFirestore.collection('users').doc(addFollow).get('followers').then(doc => {
      return{
        id:doc.id,
        ...doc.data()
      }
    })
    
    const userFollowing = await mainuser.following.concat(addFollow)

    const flUserFollwers = await followUser.followers.concat(user)

    await projectFirestore.collection('users').doc(user).update({
      following:userFollowing
    })

    await projectFirestore.collection('users').doc(addFollow).update({
      followers:flUserFollwers
    })

    await projectFirestore.collection('followers').doc(addFollow).update({
      followers: flUserFollwers
    })
  }
  
  const handleUnFollow = async (e,user, addFollow) => {
    e.preventDefault()

    const mainuser = await projectFirestore.collection('users').doc(user).get().then(doc =>{
      return{
        id:doc.id,
        ...doc.data()
      }
     })
    
    const followUser = await projectFirestore.collection('users').doc(addFollow).get().then(doc => {
      return{
        id:doc.id,
        ...doc.data()
      }
    })

    const userFollowing = await mainuser.following.filter(follow => follow!==addFollow)

    const flUserFollwers = await followUser.followers.filter(following => following !== user)

    await projectFirestore.collection('users').doc(user).update({
      following:userFollowing
    })

    await projectFirestore.collection('users').doc(addFollow).update({
      followers:flUserFollwers
    })

    await projectFirestore.collection('followers').doc(addFollow).update({
      followers: flUserFollwers
    })
  }

  const handlePostForm = async (e) => {
    e.preventDefault()

    console.log({username, post})

    try{
      const createdAt = await timestamp.fromDate(new Date())
      await projectFirestore.collection('followers').doc(username)
                    .collection('posts').add({post, username, createdAt})
      setUsername('')
      setPost('')
    }catch(err)
    {
      console.log(err)
    }
  }

  const refreshPosts = () => {
    
    const readPosts = async (ids) => {
      const reads = await ids.map(id =>projectFirestore.collection(`followers/${id}/posts`)
                          .get())
      const results = await Promise.all(reads)

      const data = await results.reduce((init,posts)=> {
          return init.concat(posts.docs.reduce((initial,post)=>{
                return initial.concat([{id:post.id,...post.data()}])
          },[]))
      },[])

      setViewPost(data.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds ))
    }

    const getPosts = async (user) => {
      
      const ids = await projectFirestore.collection('followers').where('followers','array-contains',user)
                  .get()
      
      const result = await ids.docs.map(id => id.id)
      readPosts(result)
    }

    getPosts('poojesh')
  }

  return (
    <div className="App">
      <form className="form__class" onSubmit={(e) => handlePostForm(e)}>
        <h2>Post</h2>
        <label>
          <span>Username</span>
          <input 
            type="text"
            value={username}
            onChange={({target}) => setUsername(target.value)}
            placeholder="Username"
            required
          />
        </label>

        <label>
          <span>Post</span>
          <input 
            type="text"
            value={post}
            onChange={({target}) => setPost(target.value)}
            placeholder="Post"
            required
          />
        </label>

        <button className="btn">Post</button>
      </form>

      <div className="follow_unfollow">
        
          {names && names.map(name=> (
            <span key={name.id}>
              <h2>{name.user}</h2>
              {name.followers.includes('poojesh')? 
              <button className="btn"
                      onClick={(e) => handleUnFollow(e,'poojesh',name.user)}
                >
                  Unfollow</button> :
              <button className="btn"
                    onClick={(e) => handleFollow(e,'poojesh',name.user)}>Follow</button> 
              }
            </span>
          ))}
      </div>

      <button className='btn btn--refresh' onClick={refreshPosts}>Refresh</button>
      <div className="view__posts">
        <h2>Posts</h2>
        { viewpost && viewpost.length > 0 &&
           viewpost.map(
            post => (
              <div key={post.id}>
                <p>{post.post} - by {post.username}</p>
            </div>
            )
           )
        }
      </div>

    </div>
  );
}

export default App;