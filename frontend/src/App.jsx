import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import { useDispatch, useSelector } from 'react-redux'
import getCurrentUser from './hooks/getCurrentUser'
import getSuggestedUsers from './hooks/getSuggestedUsers'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import Upload from './pages/Upload'
import getAllPost from './hooks/getAllPost'
import Loops from './pages/Loops'
import getAllLoops from './hooks/getAllLoops'
import Story from './pages/Story'
import getAllStories from './hooks/getAllStories'
import Messages from './pages/Messages'
import MessageArea from './pages/MessageArea'
import webSocketService from './services/websocket'
import { setOnlineUsers } from './redux/socketSlice'
import getFollowingList from './hooks/getFollowingList'
import getPrevChatUsers from './hooks/getPrevChatUsers'
import Search from './pages/Search'
import getAllNotifications from './hooks/getAllNotifications'
import Notifications from './pages/Notifications'
import { setNotificationData } from './redux/userSlice'

function App() {
   getCurrentUser()
   getSuggestedUsers()
   getAllPost()
   getAllLoops()
   getAllStories()
   getFollowingList()
   getPrevChatUsers()
   getAllNotifications()
  const {userData,notificationData}=useSelector(state=>state.user)
   
    const dispatch=useDispatch()
 useEffect(()=>{
  if(userData){
    webSocketService.connect(userData.userId);
    
    webSocketService.on('getOnlineUsers', (users) => {
      dispatch(setOnlineUsers(users));
    });

    webSocketService.on('newNotification', (noti) => {
      dispatch(setNotificationData([...notificationData, noti]));
    });

    return () => webSocketService.disconnect();
  }else{
    webSocketService.disconnect();
  }
 },[userData])

  return (
    <Routes>
      <Route path='/signup' element={!userData?<SignUp/>:<Navigate to={"/"}/>}/>
       <Route path='/signin' element={!userData?<SignIn/>:<Navigate to={"/"}/>}/>
        <Route path='/' element={userData?<Home/>:<Navigate to={"/signin"}/>}/>
       <Route path='/forgot-password' element={!userData?<ForgotPassword/>:<Navigate to={"/"}/>}/>
      <Route path='/profile/:userName' element={userData?<Profile/>:<Navigate to={"/signin"}/>}/>
      <Route path='/story/:userName' element={userData?<Story/>:<Navigate to={"/signin"}/>}/>
       <Route path='/upload' element={userData?<Upload/>:<Navigate to={"/signin"}/>}/>
        <Route path='/search' element={userData?<Search/>:<Navigate to={"/signin"}/>}/>
          <Route path='/editprofile' element={userData?<EditProfile/>:<Navigate to={"/signin"}/>}/>
            <Route path='/messages' element={userData?<Messages/>:<Navigate to={"/signin"}/>}/>
            <Route path='/messageArea' element={userData?<MessageArea/>:<Navigate to={"/signin"}/>}/>
             <Route path='/notifications' element={userData?<Notifications/>:<Navigate to={"/signin"}/>}/>
          <Route path='/loops' element={userData?<Loops/>:<Navigate to={"/signin"}/>}/>
    </Routes>
  )
}

export default App
