import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setNotificationData, setUserData } from '../redux/userSlice'
import { setPostData } from '../redux/postSlice'

function getAllNotifications() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
  useEffect(()=>{
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
