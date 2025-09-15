import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSuggestedUsers, setUserData } from '../redux/userSlice'
import authService from '../services/auth'

function getSuggestedUsers() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
  useEffect(()=>{
    // Only fetch if user is authenticated and userData exists
    if (!authService.isAuthenticated() || !userData) {
      return;
    }
    
const fetchUser=async ()=>{
    try {
        const result=await api.get('/api/user/suggested')
         dispatch(setSuggestedUsers(result.data))
    } catch (error) {
        console.log(error)
    }
}
fetchUser()
  },[userData])
}

export default getSuggestedUsers
