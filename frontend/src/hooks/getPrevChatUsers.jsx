import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFollowing, setUserData } from '../redux/userSlice'
import { setCurrentUserStory } from '../redux/storySlice'
import { setPrevChatUsers } from '../redux/messageSlice'

function getPrevChatUsers() {
    const dispatch=useDispatch()
    const {messages}=useSelector(state=>state.message)
  useEffect(()=>{
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
  },[messages])
}

export default getPrevChatUsers
