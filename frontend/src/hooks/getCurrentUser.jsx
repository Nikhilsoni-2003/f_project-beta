import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFollowing, setUserData } from '../redux/userSlice'
import { setCurrentUserStory } from '../redux/storySlice'
import authService from '../services/auth'

function getCurrentUser() {
    const dispatch=useDispatch()
    const {storyData}=useSelector(state=>state.story)
    const {userData}=useSelector(state=>state.user)
    
  useEffect(()=>{
    // Only fetch if user is authenticated and no user data exists
    if (!authService.isAuthenticated() || userData) {
      return;
    }
    
const fetchUser=async ()=>{
    try {
        const result=await api.get('/api/user/current')
         dispatch(setUserData(result.data))
         dispatch(setCurrentUserStory(result.data.story))
    } catch (error) {
        console.error('getCurrentUser error:', error)
        // If unauthorized, clear tokens
        if (error.response?.status === 401) {
          authService.clearTokens();
          window.location.href = '/signin';
        }
    }
}
fetchUser()
  },[storyData, userData])
}

export default getCurrentUser
