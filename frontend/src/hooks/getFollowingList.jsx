import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFollowing, setUserData } from '../redux/userSlice'
import { setCurrentUserStory } from '../redux/storySlice'
import authService from '../services/auth'

function getFollowingList() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
    const {storyData}=useSelector(state=>state.story)
  useEffect(()=>{
    // Only fetch if user is authenticated and userData exists
    if (!authService.isAuthenticated() || !userData) {
      return;
    }
    
const fetchUser=async ()=>{
    try {
        const result=await api.get('/api/user/followingList')
         dispatch(setFollowing(result.data))
    } catch (error) {
        console.log(error)
    }
}
fetchUser()
  },[storyData, userData])
}

export default getFollowingList
