import React, { useState } from "react";
import { MdAdd, MdDeleteOutline, MdUpdate, MdClose } from "react-icons/md";
import DateSelector from "../../components/input/DateSelector";
import ImageSelector from "../../components/input/ImageSelector";
import TagInput from "../../components/input/TagInput";
import axiosInstance from "../../utils/axiosInstance";
import moment from "moment";
import uploadImage from "../../utils/uploadImage";
import { toast } from "react-toastify";
import axios from "axios";
const AddEditTravelStory = ({
  storyInfo,
  type,
  onClose,
  getAllTravelStories,
  isGuest = false,
  onGuestSubmit = null
}) => {
  const [title,setTitle]=useState(storyInfo?.title || "");
  const [storyImg,setStoryImg]=useState(storyInfo?.imageUrl||null);
  const [story,setStory]=useState(storyInfo?.story || "");
  const [visitedLocation, setVisitedLocation] = useState(storyInfo?.visitedLocation||[]);
  const [visitedDate, setVisitedDate] = useState(storyInfo?.visitedDate||null);
  const [imageUrl, setImageUrl] = useState(storyInfo?.imageUrl || '');
  const [error, setError]=useState("")

  // Update Travel Story
  const updateTravelStory=async()=>{
    const storyId=storyInfo._id;
    try{
      let imageUrl="";

      let postData={
           title,
        story,
        imageUrl:storyInfo.imageUrl||"" ,
        visitedLocation,
        visitedDate:visitedDate
          ?moment(visitedDate).valueOf()
          :moment().valueOf(),
      }
      
      if(typeof storyImg === "object"){
        const imgUploadRes = await uploadImage(storyImg);
        imageUrl = imgUploadRes.imageUrl || "";

        postData = {
          ...postData,
          imageUrl : imageUrl,
        };
      }

      
      const response =await axiosInstance.post(
        "/edit-story/" + storyId,
        postData);
     
      if(response.data && response.data.story){
        toast.success ("Story Updated  Successfully");
        //Refresh Stories
        getAllTravelStories();
        //close modal or form 
        onClose();
      }
    }catch (error){
      console.log(error);
      if(
        error.response &&
        error.response.data &&
        error.response.data.message
      ){
        setError(error.response.data.message);
      }else{
        //Handle unexpected errors
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleAddOrUpdateClick = () => {
  console.log("Input Data:", {title, storyImg, story, visitedLocation, visitedDate})
  if (!title){
    setError("Please enter the title");
    return;
  }
  
  // If guest user, handle submission differently
  if (isGuest && onGuestSubmit) {
    const storyData = {
      title: title,
      story: story,
      visitedDate: visitedDate,
      visitedLocation: visitedLocation,
      imageUrl: imageUrl || 'https://picsum.photos/200/300', // Default image
      public: true // Guest stories are always public in this implementation
    };
    const result = onGuestSubmit(storyData);
    
    if (result && result.success) {
      setError("");
      onClose();
    }
    return; // Return here to exit the function for guest users
  }
  
  // Only regular users will reach this point
  setError("");
  if(type === "edit"){
    updateTravelStory();
  } else {
    addNewTravelStory();
  }
};

    //add new travel story
const addNewTravelStory = async () => {
  try{
    let imageUrl = "";

    if(storyImg) {
      const imgUploadRes = await uploadImage(storyImg);
      imageUrl = imgUploadRes.imageUrl || "";
    }

    const response = await axiosInstance.post("/add-travel-story",{
      title,
      story,
      imageUrl: imageUrl || "",
      visitedLocation,
      visitedDate: visitedDate
      ? moment(visitedDate).valueOf()
      : moment().valueOf(),
    });
    if(response.data && response.data.story){
      toast.success("Story added successfully");

      getAllTravelStories();
      onClose();
    }

  }catch(error){

  }
}

    //Delete story image and update the story
    const handleDeleteStoryImg=async()=>{
      // Deleting the image
      const deleteImgRes=await axiosInstance.delete("/delete-image",{
        params:{
          imageUrl: storyInfo.imageUrl,
        },
      });
      if(deleteImgRes.data){
        const storyId=storyInfo._id;

        const postData={
          title,
          story,
          visitedLocation,
          visitedDate:moment().valueOf(),
          imageUrl: "",
        };
        //updating story
        const response=await axiosInstance.put(
          "/edit-story/"+storyId,
          postData
        );
        setStoryImg(null);
      }
      };

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <h5 className="text-xl font-medium text-slate-700">
          {type === "add" ? "Add Story" : "Update Story"}
        </h5>

        <div>
          <div className="flex items-center gap-3 bg-cyan-50/50 p-2 rounded-l-lg">
            {type==='add'?(
            <button className='btn-small' onClick={handleAddOrUpdateClick}>
                            <MdAdd className="text-lg"/>{isGuest ? "ADD TEMPORARY STORY" : "ADD STORY"}
                        </button> 
          ):(
          <>
            <button className="btn-small" onClick={handleAddOrUpdateClick}>
            <MdUpdate className="text-lg"/> UPDATE STORY
            </button>

           
            </>
          )}

            <button className="" onClick={onClose}>
              <MdClose className="text-xl text-slate-400" />
            </button>
          </div>
          
          {error && (
            <p className="text-red-500 text-xs pt-2 text-right">{error}</p>
          )}
        </div>
      </div>
        {/* Guest mode notification */}
            {isGuest && (
                <div className="mt-3 p-2 bg-amber-50 border-l-4 border-amber-400 text-amber-700 text-sm">
                    <p>You're in guest mode. Your story will only be saved temporarily in this browser session.</p>
                </div>
            )}
      <div>
        <div className="flex-1 flex flex-col gap-2 pt-4">
            <label className="input-label">TITLE</label>
           
            <input
                type="text"
                className="text-2xl text-slate-950 outline-none"
                placeholder="A Day at the Great Wall"
                value={title}
                onChange={({ target }) => setTitle(target.value)}
                />

                <div className="my-3">
                    <DateSelector date={visitedDate} setDate={setVisitedDate}/>
                </div>

                <ImageSelector 
                image={storyImg} 
                setImage={setStoryImg} 
                handleDeleteImg={handleDeleteStoryImg}
                />
                
                <div className="flex flex-col gap-2 mt-4">
                    <label className="input-label">STORY</label>
                    <textarea
                        type="text"
                        className="text-sm text-slate-950 outline-none bg-slate-50 p-2 rounded"
                        placeholder="Your Story"
                        rows={10}
                        value={story}
                        onChange={({ target }) => setStory(target.value)}
                  />
            </div>

            <div className="pt-3">
              <label className="input-label">VISITED LOCATIONS</label>
              <TagInput tags={visitedLocation} setTags={setVisitedLocation}/>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditTravelStory;
