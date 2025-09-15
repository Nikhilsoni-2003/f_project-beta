import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import { setPostData } from '../redux/postSlice'
import authService from '../services/auth'

function getAllPost() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
  useEffect(()=>{
    // Only fetch if user is authenticated and userData exists
    if (!authService.isAuthenticated() || !userData) {
      return;
    }
    
const fetchPost=async ()=>{
    try {
        const result=await api.get('/api/post/getAll')
         dispatch(setPostData(result.data))
    } catch (error) {
        console.log(error)
    }
}
fetchPost()
  },[dispatch,userData])
}

export default getAllPost
