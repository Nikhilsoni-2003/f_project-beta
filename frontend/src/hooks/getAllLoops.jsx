import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import { setPostData } from '../redux/postSlice'
import { setLoopData } from '../redux/loopSlice'

function getAllLoops() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
   
  useEffect(()=>{
const fetchloops=async ()=>{
    try {
        const result=await api.get('/api/loop/getAll')
         dispatch(setLoopData(result.data))
    } catch (error) {
        console.log(error)
    }
}
fetchloops()
  },[dispatch,userData])
}

export default getAllLoops
