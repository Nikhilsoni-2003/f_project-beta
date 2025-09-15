import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFollowing, setUserData } from '../redux/userSlice'
import { setStoryList } from '../redux/storySlice'
import authService from '../services/auth'

function getAllStories() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
     const {storyData}=useSelector(state=>state.story)
  useEffect(()=>{
    // Only fetch if user is authenticated and userData exists
    if (!authService.isAuthenticated() || !userData) {
      return;
    }
    
const fetchStories=async ()=>{
    try {
        const result=await api.get('/api/story/getAll')
         dispatch(setStoryList(result.data))
         
    } catch (error) {
        console.log(error)
    }
}
fetchStories()
  },[userData,storyData])
}

export default getAllStories
