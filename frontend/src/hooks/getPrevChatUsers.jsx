import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFollowing, setUserData } from '../redux/userSlice'
import { setCurrentUserStory } from '../redux/storySlice'
import { setPrevChatUsers } from '../redux/messageSlice'
import authService from '../services/auth'

function getPrevChatUsers() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
    const {messages}=useSelector(state=>state.message)
  useEffect(()=>{
    // Only fetch if user is authenticated and userData exists
    if (!authService.isAuthenticated() || !userData) {
      return;
    }
    
const fetchUser=async ()=>{
    try {
        const result=await api.get('/api/message/prevChats')
         dispatch(setPrevChatUsers(result.data))
         console.log(result.data)
    } catch (error) {
        console.log(error)
    }
}
fetchUser()
  },[messages, userData])
}

export default getPrevChatUsers
