import api from '../services/api'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFollowing, setUserData } from '../redux/userSlice'
import { setCurrentUserStory } from '../redux/storySlice'

function getFollowingList() {
    const dispatch=useDispatch()
    const {storyData}=useSelector(state=>state.story)
  useEffect(()=>{
const fetchUser=async ()=>{
    try {
        const result=await api.get('/api/user/followingList')
         dispatch(setFollowing(result.data))
    } catch (error) {
        console.log(error)
    }
}
fetchUser()
  },[storyData])
}

export default getFollowingList
