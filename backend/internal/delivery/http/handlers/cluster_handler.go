package handlers

import (
	"net/http"
	"strconv"

	"kong-manager-backend/internal/domain"

	"github.com/gin-gonic/gin"
)

type ClusterHandler struct {
	Usecase domain.ClusterUsecase
}

func NewClusterHandler(u domain.ClusterUsecase) *ClusterHandler {
	return &ClusterHandler{Usecase: u}
}

func (h *ClusterHandler) Create(c *gin.Context) {
	var req domain.KongCluster
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Usecase.Create(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	req.HasAdminToken = req.AdminToken != ""
	c.JSON(http.StatusCreated, req)
}

func (h *ClusterHandler) List(c *gin.Context) {
	clusters, err := h.Usecase.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range clusters {
		clusters[i].HasAdminToken = clusters[i].AdminToken != ""
	}
	c.JSON(http.StatusOK, clusters)
}

func (h *ClusterHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseInt(idStr, 10, 32)

	cluster, err := h.Usecase.GetByID(c.Request.Context(), int32(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	cluster.HasAdminToken = cluster.AdminToken != ""
	c.JSON(http.StatusOK, cluster)
}

func (h *ClusterHandler) Update(c *gin.Context) {
	var req domain.KongCluster
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	idStr := c.Param("id")
	id, _ := strconv.ParseInt(idStr, 10, 32)
	req.ID = int32(id)

	// Preserve existing admin token if not specified in update request
	if req.AdminToken == "" {
		if existing, err := h.Usecase.GetByID(c.Request.Context(), req.ID); err == nil && existing != nil {
			req.AdminToken = existing.AdminToken
		}
	}

	if err := h.Usecase.Update(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	req.HasAdminToken = req.AdminToken != ""
	c.JSON(http.StatusOK, req)
}

func (h *ClusterHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseInt(idStr, 10, 32)

	if err := h.Usecase.Delete(c.Request.Context(), int32(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
