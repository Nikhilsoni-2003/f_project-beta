import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setNotificationData, setUserData } from '../redux/userSlice'
import { setPostData } from '../redux/postSlice'
import authService from '../services/auth'

function getAllNotifications() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
  useEffect(()=>{
    // Only fetch if user is authenticated and userData exists
    if (!authService.isAuthenticated() || !userData) {
      return;
    }
    
const fetchNotifications=async ()=>{
    try {
        const result=await api.get('/api/user/getAllNotifications')
         dispatch(setNotificationData(result.data))
    } catch (error) {
        console.log(error)
    }
}
fetchNotifications()
  },[dispatch,userData])
}

export default getAllNotifications
