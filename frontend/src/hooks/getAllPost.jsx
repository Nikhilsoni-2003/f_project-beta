import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import { setPostData } from '../redux/postSlice'

function getAllPost() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
  useEffect(()=>{
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
