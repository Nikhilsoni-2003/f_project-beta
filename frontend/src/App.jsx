import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import { useDispatch, useSelector } from 'react-redux';
import useGetCurrentUser from './hooks/getCurrentUser';
import useGetSuggestedUsers from './hooks/getSuggestedUsers';
import useGetAllPost from './hooks/getAllPost';
import useGetAllLoops from './hooks/getAllLoops';
import useGetAllStories from './hooks/getAllStories';
import useGetFollowingList from './hooks/getFollowingList';
import useGetPrevChatUsers from './hooks/getPrevChatUsers';
import useGetAllNotifications from './hooks/getAllNotifications';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Upload from './pages/Upload';
import Loops from './pages/Loops';
import Story from './pages/Story';
import Messages from './pages/Messages';
import MessageArea from './pages/MessageArea';
import webSocketService from './services/websocket';
import { setOnlineUsers } from './redux/socketSlice';
import { setNotificationData } from './redux/userSlice';
import Search from './pages/Search';
import Notifications from './pages/Notifications';

// Export serverUrl for use in other components
export const serverUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

function App() {
  const { userData: reduxUserData, notificationData } = useSelector((state) => state.user) || { userData: null, notificationData: [] };
  const dispatch = useDispatch();

  // Use custom hooks with fallback to prevent undefined errors
  const hookResult = useGetCurrentUser() || { userData: null, loading: true };
  const { userData: currentUser, loading: userLoading } = hookResult;
  const { suggestedUsers, loading: suggestedLoading } = useGetSuggestedUsers() || { suggestedUsers: [], loading: true };
  const { posts, loading: postsLoading } = useGetAllPost() || { posts: [], loading: true };
  const { loops, loading: loopsLoading } = useGetAllLoops() || { loops: [], loading: true };
  const { stories, loading: storiesLoading } = useGetAllStories() || { stories: [], loading: true };
  const { followingList, loading: followingLoading } = useGetFollowingList() || { followingList: [], loading: true };
  const { prevChatUsers, loading: prevChatLoading } = useGetPrevChatUsers() || { prevChatUsers: [], loading: true };
  const { notifications, loading: notiLoading } = useGetAllNotifications() || { notifications: [], loading: true };

  useEffect(() => {
    if (reduxUserData) {
      webSocketService.connect(reduxUserData.userId);

      webSocketService.on('getOnlineUsers', (users) => {
        dispatch(setOnlineUsers(users));
      });

      webSocketService.on('newNotification', (noti) => {
        dispatch(setNotificationData([...notificationData, noti]));
      });

      return () => webSocketService.disconnect();
    } else {
      webSocketService.disconnect();
    }
  }, [reduxUserData, dispatch, notificationData]);

  const userData = reduxUserData || currentUser; // Fallback to currentUser if reduxUserData is null

  if (userLoading || suggestedLoading || postsLoading || loopsLoading || storiesLoading || followingLoading || prevChatLoading || notiLoading) {
    return <div>Loading...</div>; // Show loading while data fetches
  }

  return (
    <Routes>
      <Route path='/signup' element={!userData ? <SignUp /> : <Navigate to="/" />} />
      <Route path='/signin' element={!userData ? <SignIn /> : <Navigate to="/" />} />
      <Route path='/' element={userData ? <Home /> : <Navigate to="/signin" />} />
      <Route path='/forgot-password' element={!userData ? <ForgotPassword /> : <Navigate to="/" />} />
      <Route path='/profile/:userName' element={userData ? <Profile /> : <Navigate to="/signin" />} />
      <Route path='/story/:userName' element={userData ? <Story /> : <Navigate to="/signin" />} />
      <Route path='/upload' element={userData ? <Upload /> : <Navigate to="/signin" />} />
      <Route path='/search' element={userData ? <Search /> : <Navigate to="/signin" />} />
      <Route path='/editprofile' element={userData ? <EditProfile /> : <Navigate to="/signin" />} />
      <Route path='/messages' element={userData ? <Messages /> : <Navigate to="/signin" />} />
      <Route path='/messageArea' element={userData ? <MessageArea /> : <Navigate to="/signin" />} />
      <Route path='/notifications' element={userData ? <Notifications /> : <Navigate to="/signin" />} />
      <Route path='/loops' element={userData ? <Loops /> : <Navigate to="/signin" />} />
    </Routes>
  );
}

export default App;